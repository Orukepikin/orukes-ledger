import { calculatePercentage, formatCurrency, formatCompactCurrency } from '@/lib/utils';

describe('Budget Calculations', () => {
  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(75, 100)).toBe(75);
      expect(calculatePercentage(25, 100)).toBe(25);
    });

    it('should return 0 when total is 0', () => {
      expect(calculatePercentage(50, 0)).toBe(0);
    });

    it('should handle values exceeding 100%', () => {
      expect(calculatePercentage(150, 100)).toBe(150);
    });

    it('should round to nearest integer', () => {
      expect(calculatePercentage(33, 100)).toBe(33);
      expect(calculatePercentage(1, 3)).toBe(33);
    });
  });

  describe('formatCurrency', () => {
    it('should format NGN correctly', () => {
      expect(formatCurrency(1000, 'NGN')).toBe('₦1,000');
      expect(formatCurrency(1500000, 'NGN')).toBe('₦1,500,000');
    });

    it('should format USD correctly', () => {
      expect(formatCurrency(1000, 'USD')).toBe('$1,000');
    });

    it('should format GBP correctly', () => {
      expect(formatCurrency(1000, 'GBP')).toBe('£1,000');
    });

    it('should handle decimal values', () => {
      expect(formatCurrency(1000.50, 'NGN')).toBe('₦1,000.5');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0, 'NGN')).toBe('₦0');
    });
  });

  describe('formatCompactCurrency', () => {
    it('should format thousands correctly', () => {
      expect(formatCompactCurrency(1500, 'NGN')).toBe('₦1.5K');
      expect(formatCompactCurrency(25000, 'NGN')).toBe('₦25K');
    });

    it('should format millions correctly', () => {
      expect(formatCompactCurrency(1500000, 'NGN')).toBe('₦1.5M');
      expect(formatCompactCurrency(25000000, 'NGN')).toBe('₦25M');
    });

    it('should not compact small numbers', () => {
      expect(formatCompactCurrency(500, 'NGN')).toBe('₦500');
    });
  });
});

describe('Budget Alert Thresholds', () => {
  const checkBudgetAlert = (spent: number, budget: number, threshold: number): boolean => {
    const percentage = calculatePercentage(spent, budget);
    return percentage >= threshold;
  };

  it('should trigger alert at 80% threshold', () => {
    expect(checkBudgetAlert(80000, 100000, 80)).toBe(true);
    expect(checkBudgetAlert(79000, 100000, 80)).toBe(false);
  });

  it('should trigger alert at 100% threshold', () => {
    expect(checkBudgetAlert(100000, 100000, 100)).toBe(true);
    expect(checkBudgetAlert(99000, 100000, 100)).toBe(false);
  });

  it('should trigger alert when over budget', () => {
    expect(checkBudgetAlert(120000, 100000, 80)).toBe(true);
    expect(checkBudgetAlert(120000, 100000, 100)).toBe(true);
  });
});
