import { Types } from 'mongoose';

// Purchase Item Types
export interface IPurchaseItem {
    vendorMaterial: Types.ObjectId;
    material: Types.ObjectId;
    materialType: 'Board' | 'Edging' | 'Surface' | 'Hardware';
    quantity: number;
    unit: string;
    pricePerUnit: number;
    totalPrice: number;
    receivedQuantity: number;
    status: 'pending' | 'partially_received' | 'received' | 'cancelled';
}

// Payment Details Types
export interface IPaymentDetail {
    _id: Types.ObjectId;
    amount: number;
    paymentDate: Date;
    paymentMethod: 'cash' | 'bank_transfer' | 'check' | 'other';
    reference?: string;
    notes?: string;
}

// Attachment Types
export interface IAttachment {
    _id: Types.ObjectId;
    name: string;
    url: string;
    type: string;
}

// Purchase Document Type
export interface IPurchase {
    _id: Types.ObjectId;
    purchaseNumber: string;
    vendor: Types.ObjectId;
    items: IPurchaseItem[];
    totalAmount: number;
    status: 'draft' | 'ordered' | 'partially_received' | 'completed' | 'cancelled';
    paymentStatus: 'pending' | 'partially_paid' | 'paid';
    paymentDetails: IPaymentDetail[];
    expectedDeliveryDate?: Date;
    deliveryAddress: string;
    notes?: string;
    attachments: IAttachment[];
    createdAt: Date;
    updatedAt: Date;
}