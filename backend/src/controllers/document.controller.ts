import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendDocument } from '../services/whatsapp.service';

// Share consignment documents via WhatsApp
export const shareConsignmentDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { consignmentId } = req.params;
    const { documentTypes, phoneNumber } = req.body; // ['LR', 'POD', 'Invoice']
    
    if (!documentTypes || !Array.isArray(documentTypes) || documentTypes.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Document types are required'
      });
      return;
    }

    // Get consignment details
    const consignmentResult = await query(
      `SELECT 
        c.*,
        fb.city as from_city,
        tb.city as to_city
       FROM consignments c
       LEFT JOIN branches fb ON c.from_branch_id = fb.id
       LEFT JOIN branches tb ON c.to_branch_id = tb.id
       WHERE c.id = $1 AND c.company_id = $2`,
      [consignmentId, req.user?.companyId]
    );

    if (consignmentResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Consignment not found'
      });
      return;
    }

    const consignment = consignmentResult.rows[0];
    const targetPhone = phoneNumber || consignment.consignee_phone || consignment.consignor_phone;

    if (!targetPhone) {
      res.status(400).json({
        success: false,
        error: 'No phone number available for sharing'
      });
      return;
    }

    const results: any[] = [];

    // Share each requested document
    for (const docType of documentTypes) {
      try {
        let documentUrl = '';
        let available = true;

        switch (docType) {
          case 'LR':
            // Generate LR document URL
            documentUrl = `https://app.desicargo.com/api/v1/documents/lr/${consignmentId}?token=${generateDocumentToken(consignmentId, 'LR')}`;
            break;
          
          case 'POD':
            if (consignment.status !== 'delivered') {
              available = false;
            } else {
              documentUrl = `https://app.desicargo.com/api/v1/documents/pod/${consignmentId}?token=${generateDocumentToken(consignmentId, 'POD')}`;
            }
            break;
          
          case 'Invoice':
            if (!consignment.invoice_id) {
              available = false;
            } else {
              documentUrl = `https://app.desicargo.com/api/v1/documents/invoice/${consignment.invoice_id}?token=${generateDocumentToken(consignment.invoice_id, 'Invoice')}`;
            }
            break;
          
          default:
            available = false;
        }

        if (!available) {
          results.push({
            documentType: docType,
            status: 'not_available',
            reason: docType === 'POD' ? 'Consignment not delivered yet' : 
                   docType === 'Invoice' ? 'Consignment not invoiced yet' : 'Invalid document type'
          });
          continue;
        }

        // Send WhatsApp message with document
        await sendDocument(targetPhone, {
          cnNumber: consignment.cn_number,
          documentType: docType as 'LR' | 'POD' | 'Invoice',
          documentUrl: documentUrl,
          consigneeName: consignment.consignee_name
        });

        results.push({
          documentType: docType,
          status: 'sent',
          sentTo: targetPhone
        });

        // Log document sharing activity
        await query(
          `INSERT INTO document_shares (
            consignment_id, document_type, shared_with, shared_by, share_method
          ) VALUES ($1, $2, $3, $4, $5)`,
          [consignmentId, docType, targetPhone, req.user?.userId, 'whatsapp']
        );

      } catch (error) {
        console.error(`Error sharing ${docType} document:`, error);
        results.push({
          documentType: docType,
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'sent').length;
    const failureCount = results.filter(r => r.status === 'failed').length;

    res.json({
      success: successCount > 0,
      message: `Document sharing completed. Sent: ${successCount}, Failed: ${failureCount}`,
      data: {
        consignmentId,
        cnNumber: consignment.cn_number,
        sharedTo: targetPhone,
        results
      }
    });
  } catch (error) {
    console.error('Document sharing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to share documents'
    });
  }
};

// Share invoice via WhatsApp
export const shareInvoiceDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const { phoneNumber } = req.body;

    // Get invoice details
    const invoiceResult = await query(
      `SELECT 
        i.*,
        c.name as customer_name,
        c.phone as customer_phone
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       WHERE i.id = $1`,
      [invoiceId]
    );

    if (invoiceResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
      return;
    }

    const invoice = invoiceResult.rows[0];
    const targetPhone = phoneNumber || invoice.customer_phone;

    if (!targetPhone) {
      res.status(400).json({
        success: false,
        error: 'No phone number available for sharing'
      });
      return;
    }

    // Generate secure document URL
    const documentUrl = `https://app.desicargo.com/api/v1/documents/invoice/${invoiceId}?token=${generateDocumentToken(invoiceId, 'Invoice')}`;

    // Send WhatsApp message with invoice
    await sendDocument(targetPhone, {
      cnNumber: invoice.invoice_number,
      documentType: 'Invoice',
      documentUrl: documentUrl,
      consigneeName: invoice.customer_name
    });

    // Log document sharing
    await query(
      `INSERT INTO document_shares (
        invoice_id, document_type, shared_with, shared_by, share_method
      ) VALUES ($1, $2, $3, $4, $5)`,
      [invoiceId, 'Invoice', targetPhone, req.user?.userId, 'whatsapp']
    );

    res.json({
      success: true,
      message: 'Invoice shared successfully via WhatsApp',
      data: {
        invoiceId,
        invoiceNumber: invoice.invoice_number,
        sharedTo: targetPhone
      }
    });
  } catch (error) {
    console.error('Invoice sharing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to share invoice'
    });
  }
};

// Generate secure token for document access
function generateDocumentToken(documentId: string, documentType: string): string {
  const crypto = require('crypto');
  const secret = process.env.DOCUMENT_TOKEN_SECRET || 'fallback-secret-key';
  const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  
  const payload = `${documentId}-${documentType}-${expiry}`;
  const token = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  
  return Buffer.from(`${payload}:${token}`).toString('base64');
}

// Verify document token (for document access endpoint)
export const verifyDocumentToken = (token: string): { valid: boolean; documentId?: string; documentType?: string } => {
  try {
    const crypto = require('crypto');
    const secret = process.env.DOCUMENT_TOKEN_SECRET || 'fallback-secret-key';
    
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [payload, providedToken] = decoded.split(':');
    
    if (!payload || !providedToken) {
      return { valid: false };
    }
    
    const [documentId, documentType, expiryStr] = payload.split('-');
    const expiry = parseInt(expiryStr);
    
    if (Date.now() > expiry) {
      return { valid: false }; // Token expired
    }
    
    const expectedToken = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    
    if (providedToken !== expectedToken) {
      return { valid: false }; // Invalid token
    }
    
    return { valid: true, documentId, documentType };
  } catch (error) {
    return { valid: false };
  }
};

// Handle document downloads with token verification
export const downloadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, id } = req.params;
    const { token } = req.query;

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    const verification = verifyDocumentToken(token as string);
    if (!verification.valid || verification.documentId !== id || verification.documentType !== type) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    // Generate and serve the document based on type
    switch (type.toLowerCase()) {
      case 'lr':
        // Generate LR PDF (implement PDF generation logic)
        res.json({
          success: true,
          message: 'LR document generation - implement PDF logic',
          documentType: 'LR',
          documentId: id
        });
        break;
      
      case 'pod':
        // Generate POD PDF
        res.json({
          success: true,
          message: 'POD document generation - implement PDF logic',
          documentType: 'POD',
          documentId: id
        });
        break;
      
      case 'invoice':
        // Generate Invoice PDF
        res.json({
          success: true,
          message: 'Invoice document generation - implement PDF logic',
          documentType: 'Invoice',
          documentId: id
        });
        break;
      
      default:
        res.status(400).json({
          success: false,
          error: 'Invalid document type'
        });
    }
  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download document'
    });
  }
};