import { describe, it, expect, beforeEach } from 'vitest';
import { mockClarityBitcoin } from './helpers/clarity-bitcoin.js';
import { mockClarityValue } from './helpers/clarity-value.js';

// Mock the Clarity runtime environment
const mockClarity = {
  contracts: {
    'artisan-verification': {
      functions: {
        'register-artisan': (artisanId, name, credentials) => {
          // Implementation of register-artisan logic
          if (mockClarity.storage.artisans[artisanId]) {
            return { type: 'err', value: 1 }; // Artisan ID already exists
          }
          
          mockClarity.storage.artisans[artisanId] = {
            principal: mockClarity.tx.sender,
            name,
            credentials,
            verified: false,
            verificationDate: 0
          };
          
          return { type: 'ok', value: true };
        },
        'verify-artisan': (artisanId) => {
          // Implementation of verify-artisan logic
          if (mockClarity.tx.sender !== mockClarity.storage.admin) {
            return { type: 'err', value: 3 }; // Not authorized
          }
          
          if (!mockClarity.storage.artisans[artisanId]) {
            return { type: 'err', value: 2 }; // Artisan not found
          }
          
          mockClarity.storage.artisans[artisanId].verified = true;
          mockClarity.storage.artisans[artisanId].verificationDate = mockClarity.blockHeight;
          
          return { type: 'ok', value: true };
        },
        'is-verified-artisan': (artisanId) => {
          // Implementation of is-verified-artisan logic
          if (!mockClarity.storage.artisans[artisanId]) {
            return { type: 'err', value: 2 }; // Artisan not found
          }
          
          return { type: 'ok', value: mockClarity.storage.artisans[artisanId].verified };
        },
        'set-admin': (newAdmin) => {
          // Implementation of set-admin logic
          if (mockClarity.tx.sender !== mockClarity.storage.admin) {
            return { type: 'err', value: 3 }; // Not authorized
          }
          
          mockClarity.storage.admin = newAdmin;
          
          return { type: 'ok', value: true };
        }
      }
    }
  },
  storage: {
    admin: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    artisans: {}
  },
  tx: {
    sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'
  },
  blockHeight: 100
};

describe('Artisan Verification Contract', () => {
  beforeEach(() => {
    // Reset storage before each test
    mockClarity.storage.artisans = {};
    mockClarity.storage.admin = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    mockClarity.tx.sender = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    mockClarity.blockHeight = 100;
  });
  
  describe('register-artisan', () => {
    it('should register a new artisan successfully', () => {
      const result = mockClarity.contracts['artisan-verification'].functions['register-artisan'](
          'artisan-123',
          'John Woodworker',
          'Master Craftsman, Certified by Guild of Woodworkers'
      );
      
      expect(result).toEqual({ type: 'ok', value: true });
      expect(mockClarity.storage.artisans['artisan-123']).toBeDefined();
      expect(mockClarity.storage.artisans['artisan-123'].verified).toBe(false);
    });
    
    it('should fail if artisan ID already exists', () => {
      // Register first time
      mockClarity.contracts['artisan-verification'].functions['register-artisan'](
          'artisan-123',
          'John Woodworker',
          'Master Craftsman, Certified by Guild of Woodworkers'
      );
      
      // Try to register again with same ID
      const result = mockClarity.contracts['artisan-verification'].functions['register-artisan'](
          'artisan-123',
          'Jane Woodworker',
          'Different credentials'
      );
      
      expect(result).toEqual({ type: 'err', value: 1 });
    });
  });
  
  describe('verify-artisan', () => {
    it('should verify an artisan successfully', () => {
      // Register an artisan first
      mockClarity.contracts['artisan-verification'].functions['register-artisan'](
          'artisan-123',
          'John Woodworker',
          'Master Craftsman, Certified by Guild of Woodworkers'
      );
      
      // Verify the artisan
      const result = mockClarity.contracts['artisan-verification'].functions['verify-artisan'](
          'artisan-123'
      );
      
      expect(result).toEqual({ type: 'ok', value: true });
      expect(mockClarity.storage.artisans['artisan-123'].verified).toBe(true);
      expect(mockClarity.storage.artisans['artisan-123'].verificationDate).toBe(100);
    });
    
    it('should fail if artisan does not exist', () => {
      const result = mockClarity.contracts['artisan-verification'].functions['verify-artisan'](
          'non-existent-artisan'
      );
      
      expect(result).toEqual({ type: 'err', value: 2 });
    });
    
    it('should fail if caller is not admin', () => {
      // Register an artisan first
      mockClarity.contracts['artisan-verification'].functions['register-artisan'](
          'artisan-123',
          'John Woodworker',
          'Master Craftsman, Certified by Guild of Woodworkers'
      );
      
      // Change sender to non-admin
      mockClarity.tx.sender = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
      
      // Try to verify the artisan
      const result = mockClarity.contracts['artisan-verification'].functions['verify-artisan'](
          'artisan-123'
      );
      
      expect(result).toEqual({ type: 'err', value: 3 });
      expect(mockClarity.storage.artisans['artisan-123'].verified).toBe(false);
    });
  });
  
  describe('is-verified-artisan', () => {
    it('should return verification status correctly', () => {
      // Register an artisan first
      mockClarity.contracts['artisan-verification'].functions['register-artisan'](
          'artisan-123',
          'John Woodworker',
          'Master Craftsman, Certified by Guild of Woodworkers'
      );
      
      // Check verification status (should be false)
      let result = mockClarity.contracts['artisan-verification'].functions['is-verified-artisan'](
          'artisan-123'
      );
      
      expect(result).toEqual({ type: 'ok', value: false });
      
      // Verify the artisan
      mockClarity.contracts['artisan-verification'].functions['verify-artisan'](
          'artisan-123'
      );
      
      // Check verification status again (should be true)
      result = mockClarity.contracts['artisan-verification'].functions['is-verified-artisan'](
          'artisan-123'
      );
      
      expect(result).toEqual({ type: 'ok', value: true });
    });
    
    it('should fail if artisan does not exist', () => {
      const result = mockClarity.contracts['artisan-verification'].functions['is-verified-artisan'](
          'non-existent-artisan'
      );
      
      expect(result).toEqual({ type: 'err', value: 2 });
    });
  });
  
  describe('set-admin', () => {
    it('should change admin successfully', () => {
      const newAdmin = 'ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
      
      const result = mockClarity.contracts['artisan-verification'].functions['set-admin'](
          newAdmin
      );
      
      expect(result).toEqual({ type: 'ok', value: true });
      expect(mockClarity.storage.admin).toBe(newAdmin);
    });
    
    it('should fail if caller is not admin', () => {
      // Change sender to non-admin
      mockClarity.tx.sender = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
      
      const newAdmin = 'ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
      
      const result = mockClarity.contracts['artisan-verification'].functions['set-admin'](
          newAdmin
      );
      
      expect(result).toEqual({ type: 'err', value: 3 });
      expect(mockClarity.storage.admin).toBe('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM');
    });
  });
});
