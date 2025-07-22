import pool from '../config/database';
import { Expense, ExpenseCategory, ExpenseFilter, TripPLReport, VehiclePLReport, ExpenseSummary, RecurringExpense } from '../models/expense.types';

export class ExpenseService {
  async getCategories(companyId: string): Promise<ExpenseCategory[]> {
    const result = await pool.query(
      'SELECT * FROM expense_categories WHERE company_id = $1 AND is_active = true ORDER BY category_type, category_name',
      [companyId]
    );
    return result.rows;
  }

  async createExpense(expense: Partial<Expense>): Promise<Expense> {
    const query = `
      INSERT INTO expenses (
        company_id, expense_date, category_id, amount, description,
        vehicle_id, driver_id, ogpl_id, branch_id,
        payment_mode, reference_number, bill_number, attachment_url, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    
    const values = [
      expense.company_id,
      expense.expense_date,
      expense.category_id,
      expense.amount,
      expense.description,
      expense.vehicle_id,
      expense.driver_id,
      expense.ogpl_id,
      expense.branch_id,
      expense.payment_mode,
      expense.reference_number,
      expense.bill_number,
      expense.attachment_url,
      expense.created_by
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getExpenses(filter: ExpenseFilter): Promise<Expense[]> {
    let query = `
      SELECT 
        e.*,
        ec.category_name,
        ec.category_type,
        v.vehicle_number,
        d.driver_name,
        o.ogpl_number,
        b.branch_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      LEFT JOIN vehicles v ON e.vehicle_id = v.id
      LEFT JOIN drivers d ON e.driver_id = d.id
      LEFT JOIN ogpl o ON e.ogpl_id = o.id
      LEFT JOIN branches b ON e.branch_id = b.id
      WHERE e.company_id = $1
    `;
    
    const values: any[] = [filter.company_id];
    let paramIndex = 2;

    if (filter.branch_id) {
      query += ` AND e.branch_id = $${paramIndex}`;
      values.push(filter.branch_id);
      paramIndex++;
    }

    if (filter.vehicle_id) {
      query += ` AND e.vehicle_id = $${paramIndex}`;
      values.push(filter.vehicle_id);
      paramIndex++;
    }

    if (filter.driver_id) {
      query += ` AND e.driver_id = $${paramIndex}`;
      values.push(filter.driver_id);
      paramIndex++;
    }

    if (filter.ogpl_id) {
      query += ` AND e.ogpl_id = $${paramIndex}`;
      values.push(filter.ogpl_id);
      paramIndex++;
    }

    if (filter.category_id) {
      query += ` AND e.category_id = $${paramIndex}`;
      values.push(filter.category_id);
      paramIndex++;
    }

    if (filter.category_type) {
      query += ` AND ec.category_type = $${paramIndex}`;
      values.push(filter.category_type);
      paramIndex++;
    }

    if (filter.from_date) {
      query += ` AND e.expense_date >= $${paramIndex}`;
      values.push(filter.from_date);
      paramIndex++;
    }

    if (filter.to_date) {
      query += ` AND e.expense_date <= $${paramIndex}`;
      values.push(filter.to_date);
      paramIndex++;
    }

    query += ' ORDER BY e.expense_date DESC, e.created_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  async updateExpense(id: string, expense: Partial<Expense>): Promise<Expense> {
    const query = `
      UPDATE expenses SET
        expense_date = COALESCE($2, expense_date),
        category_id = COALESCE($3, category_id),
        amount = COALESCE($4, amount),
        description = COALESCE($5, description),
        vehicle_id = COALESCE($6, vehicle_id),
        driver_id = COALESCE($7, driver_id),
        ogpl_id = COALESCE($8, ogpl_id),
        payment_mode = COALESCE($9, payment_mode),
        reference_number = COALESCE($10, reference_number),
        bill_number = COALESCE($11, bill_number),
        attachment_url = COALESCE($12, attachment_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      id,
      expense.expense_date,
      expense.category_id,
      expense.amount,
      expense.description,
      expense.vehicle_id,
      expense.driver_id,
      expense.ogpl_id,
      expense.payment_mode,
      expense.reference_number,
      expense.bill_number,
      expense.attachment_url
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getTripPL(ogplId: string): Promise<TripPLReport> {
    // Get OGPL details
    const ogplResult = await pool.query(`
      SELECT 
        o.id, o.ogpl_number, o.ogpl_date,
        o.from_branch_id, o.to_branch_id,
        fb.branch_name as from_branch,
        tb.branch_name as to_branch,
        v.vehicle_number
      FROM ogpl o
      JOIN branches fb ON o.from_branch_id = fb.id
      JOIN branches tb ON o.to_branch_id = tb.id
      JOIN vehicles v ON o.vehicle_id = v.id
      WHERE o.id = $1
    `, [ogplId]);

    if (ogplResult.rows.length === 0) {
      throw new Error('OGPL not found');
    }

    const ogpl = ogplResult.rows[0];

    // Get revenue from consignments
    const revenueResult = await pool.query(`
      SELECT 
        COUNT(*) as consignment_count,
        SUM(basic_freight) as total_freight,
        SUM(door_delivery_charges + hamali_charges + statistical_charges + 
            other_charges + gst_amount) as other_charges
      FROM consignments
      WHERE ogpl_id = $1
    `, [ogplId]);

    const revenue = revenueResult.rows[0];

    // Get expenses
    const expensesResult = await pool.query(`
      SELECT 
        ec.category_name,
        SUM(e.amount) as amount
      FROM expenses e
      JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.ogpl_id = $1
      GROUP BY ec.category_name
      ORDER BY amount DESC
    `, [ogplId]);

    const totalExpenses = expensesResult.rows.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const totalRevenue = parseFloat(revenue.total_freight || 0) + parseFloat(revenue.other_charges || 0);
    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      ogpl_id: ogpl.id,
      ogpl_number: ogpl.ogpl_number,
      route: `${ogpl.from_branch} → ${ogpl.to_branch}`,
      vehicle_number: ogpl.vehicle_number,
      trip_date: ogpl.ogpl_date,
      revenue: {
        consignment_count: parseInt(revenue.consignment_count),
        total_freight: parseFloat(revenue.total_freight || 0),
        other_charges: parseFloat(revenue.other_charges || 0),
        total_revenue: totalRevenue
      },
      expenses: {
        category_wise: expensesResult.rows.map(e => ({
          category_name: e.category_name,
          amount: parseFloat(e.amount)
        })),
        total_expenses: totalExpenses
      },
      profit: profit,
      profit_margin: profitMargin
    };
  }

  async getVehiclePL(vehicleId: string, fromDate: Date, toDate: Date): Promise<VehiclePLReport> {
    // Get vehicle details
    const vehicleResult = await pool.query(
      'SELECT id, vehicle_number FROM vehicles WHERE id = $1',
      [vehicleId]
    );

    if (vehicleResult.rows.length === 0) {
      throw new Error('Vehicle not found');
    }

    const vehicle = vehicleResult.rows[0];

    // Get trip count and revenue
    const tripsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT o.id) as total_trips,
        SUM(c.basic_freight + c.door_delivery_charges + c.hamali_charges + 
            c.statistical_charges + c.other_charges + c.gst_amount) as total_revenue
      FROM ogpl o
      JOIN consignments c ON c.ogpl_id = o.id
      WHERE o.vehicle_id = $1 
        AND o.ogpl_date >= $2 
        AND o.ogpl_date <= $3
    `, [vehicleId, fromDate, toDate]);

    // Get expenses by category
    const expensesResult = await pool.query(`
      SELECT 
        ec.category_name,
        SUM(e.amount) as amount
      FROM expenses e
      JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.vehicle_id = $1 
        AND e.expense_date >= $2 
        AND e.expense_date <= $3
      GROUP BY ec.category_name
    `, [vehicleId, fromDate, toDate]);

    // Calculate expense breakdown
    const expenseBreakdown = {
      fuel: 0,
      driver: 0,
      maintenance: 0,
      others: 0,
      total: 0
    };

    expensesResult.rows.forEach(exp => {
      const amount = parseFloat(exp.amount);
      expenseBreakdown.total += amount;

      if (exp.category_name.toLowerCase().includes('fuel')) {
        expenseBreakdown.fuel += amount;
      } else if (exp.category_name.toLowerCase().includes('driver') || 
                 exp.category_name.toLowerCase().includes('salary')) {
        expenseBreakdown.driver += amount;
      } else if (exp.category_name.toLowerCase().includes('maintenance') || 
                 exp.category_name.toLowerCase().includes('repair')) {
        expenseBreakdown.maintenance += amount;
      } else {
        expenseBreakdown.others += amount;
      }
    });

    const totalRevenue = parseFloat(tripsResult.rows[0].total_revenue || 0);
    const profit = totalRevenue - expenseBreakdown.total;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      vehicle_id: vehicle.id,
      vehicle_number: vehicle.vehicle_number,
      period: `${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`,
      total_trips: parseInt(tripsResult.rows[0].total_trips),
      total_km: 0, // TODO: Calculate from trip details
      revenue: totalRevenue,
      expenses: expenseBreakdown,
      profit: profit,
      profit_margin: profitMargin
    };
  }

  async getExpenseSummary(companyId: string, fromDate: Date, toDate: Date): Promise<ExpenseSummary> {
    // Get total revenue
    const revenueResult = await pool.query(`
      SELECT 
        SUM(basic_freight + door_delivery_charges + hamali_charges + 
            statistical_charges + other_charges + gst_amount) as total_revenue
      FROM consignments c
      JOIN ogpl o ON c.ogpl_id = o.id
      WHERE c.company_id = $1 
        AND o.ogpl_date >= $2 
        AND o.ogpl_date <= $3
    `, [companyId, fromDate, toDate]);

    // Get expenses by category
    const expensesResult = await pool.query(`
      SELECT 
        ec.category_name,
        ec.category_type,
        SUM(e.amount) as amount
      FROM expenses e
      JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.company_id = $1 
        AND e.expense_date >= $2 
        AND e.expense_date <= $3
      GROUP BY ec.category_name, ec.category_type
      ORDER BY amount DESC
    `, [companyId, fromDate, toDate]);

    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue || 0);
    const totalExpenses = expensesResult.rows.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const netProfit = totalRevenue - totalExpenses;

    const expenseBreakdown = expensesResult.rows.map(exp => ({
      category_name: exp.category_name,
      category_type: exp.category_type,
      amount: parseFloat(exp.amount),
      percentage: totalExpenses > 0 ? (parseFloat(exp.amount) / totalExpenses) * 100 : 0
    }));

    const topExpenses = expensesResult.rows.slice(0, 5).map(exp => ({
      category_name: exp.category_name,
      amount: parseFloat(exp.amount)
    }));

    return {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      expense_breakdown: expenseBreakdown,
      top_expenses: topExpenses
    };
  }

  async createRecurringExpense(expense: Partial<RecurringExpense>): Promise<RecurringExpense> {
    const query = `
      INSERT INTO recurring_expenses (
        company_id, expense_name, category_id, amount, frequency,
        vehicle_id, driver_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      expense.company_id,
      expense.expense_name,
      expense.category_id,
      expense.amount,
      expense.frequency,
      expense.vehicle_id,
      expense.driver_id
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async processRecurringExpenses(companyId: string, frequency: string): Promise<number> {
    // Get active recurring expenses
    const recurringResult = await pool.query(`
      SELECT * FROM recurring_expenses 
      WHERE company_id = $1 AND frequency = $2 AND is_active = true
    `, [companyId, frequency]);

    let processedCount = 0;

    for (const recurring of recurringResult.rows) {
      await this.createExpense({
        company_id: recurring.company_id,
        expense_date: new Date(),
        category_id: recurring.category_id,
        amount: recurring.amount,
        description: `${recurring.expense_name} (Recurring ${recurring.frequency})`,
        vehicle_id: recurring.vehicle_id,
        driver_id: recurring.driver_id,
        created_by: 'system'
      });
      processedCount++;
    }

    return processedCount;
  }
}

export default new ExpenseService();