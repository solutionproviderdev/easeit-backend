import { Types } from 'mongoose';

// Contact Types
export interface IContact {
	_id: Types.ObjectId;
	name: string;
	phone: string;
	email?: string;
	designation?: string;
}

// Vendor Material Types
export interface IVendorMaterial {
	_id: Types.ObjectId;
	type: 'Board' | 'Edging' | 'Surface' | 'Hardware';
	material: Types.ObjectId;
	price: number;
	unit: string;
	lastUpdated?: Date;
}

// Vendor Document Type
export interface IVendor {
	_id: Types.ObjectId;
	name: string;
	address: string;
	contacts: IContact[];
	materials: IVendorMaterial[];
	rating?: number;
	image?: string;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}
