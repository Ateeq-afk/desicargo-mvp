import { Request, Response } from 'express';
import expenseService from '../services/expenseService';
import { AuthRequest } from '../middleware/auth.middleware';

export const expenseController = {
  async getCategories(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const categories = await expenseService.getCategories(companyId);
      res.json(categories);
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      res.status(500).json({ error: 'Failed to fetch expense categories' });
    }
  },

  async createExpense(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      
      const expense = await expenseService.createExpense({
        ...req.body,
        company_id: companyId,
        created_by: userId
      });

      res.status(201).json(expense);
    } catch (error) {
      console.error('Error creating expense:', error);
      res.status(500).json({ error: 'Failed to create expense' });
    }
  },

  async getExpenses(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      
      const filter = {
        company_id: companyId,
        branch_id: req.query.branch_id as string,
        vehicle_id: req.query.vehicle_id as string,
        driver_id: req.query.driver_id as string,
        ogpl_id: req.query.ogpl_id as string,
        category_id: req.query.category_id as string,
        category_type: req.query.category_type as 'direct' | 'indirect',
        from_date: req.query.from_date ? new Date(req.query.from_date as string) : undefined,
        to_date: req.query.to_date ? new Date(req.query.to_date as string) : undefined,
        payment_mode: req.query.payment_mode as string
      };

      const expenses = await expenseService.getExpenses(filter);
      res.json(expenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  },

  async updateExpense(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const expense = await expenseService.updateExpense(id, req.body);
      
      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      res.json(expense);
    } catch (error) {
      console.error('Error updating expense:', error);
      res.status(500).json({ error: 'Failed to update expense' });
    }
  },

  async deleteExpense(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const deleted = await expenseService.deleteExpense(id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
      console.error('Error deleting expense:', error);
      res.status(500).json({ error: 'Failed to delete expense' });
    }
  },

  async getTripPL(req: AuthRequest, res: Response) {
    try {
      const { ogplId } = req.params;
      const report = await expenseService.getTripPL(ogplId);
      res.json(report);
    } catch (error) {
      console.error('Error generating trip P&L:', error);
      res.status(500).json({ error: 'Failed to generate trip P&L report' });
    }
  },

  async getVehiclePL(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const vehicleId = req.query.vehicle_id as string;
      const fromDate = new Date(req.query.from_date as string);
      const toDate = new Date(req.query.to_date as string);

      if (!vehicleId) {
        return res.status(400).json({ error: 'Vehicle ID is required' });
      }

      const report = await expenseService.getVehiclePL(vehicleId, fromDate, toDate);
      res.json(report);
    } catch (error) {
      console.error('Error generating vehicle P&L:', error);
      res.status(500).json({ error: 'Failed to generate vehicle P&L report' });
    }
  },

  async getExpenseSummary(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const fromDate = new Date(req.query.from_date as string || new Date().setMonth(new Date().getMonth() - 1));
      const toDate = new Date(req.query.to_date as string || new Date());

      const summary = await expenseService.getExpenseSummary(companyId, fromDate, toDate);
      res.json(summary);
    } catch (error) {
      console.error('Error generating expense summary:', error);
      res.status(500).json({ error: 'Failed to generate expense summary' });
    }
  },

  async createRecurringExpense(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      
      const expense = await expenseService.createRecurringExpense({
        ...req.body,
        company_id: companyId
      });

      res.status(201).json(expense);
    } catch (error) {
      console.error('Error creating recurring expense:', error);
      res.status(500).json({ error: 'Failed to create recurring expense' });
    }
  },

  async processRecurringExpenses(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const companyId = req.user!.companyId;
      const { frequency } = req.body;

      if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
        return res.status(400).json({ error: 'Invalid frequency' });
      }

      const count = await expenseService.processRecurringExpenses(companyId, frequency);
      res.json({ message: `Processed ${count} recurring expenses` });
    } catch (error) {
      console.error('Error processing recurring expenses:', error);
      res.status(500).json({ error: 'Failed to process recurring expenses' });
    }
  }
};