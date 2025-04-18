import { Document, Types } from 'mongoose';

// Base interfaces for common fields
export interface BaseDocument extends Document {
    _id: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

// Basic material interfaces
export interface IBaseMaterial extends BaseDocument {
    name: string;
    description?: string;
    image?: string;
}

export interface IBrand extends BaseDocument {
    name: string;
    description?: string;
    image?: string;
}

export interface IThickness extends BaseDocument {
    value: number;
    unit: 'mm' | 'cm' | 'm' | 'in' | 'ft';
}

export interface ISurface extends BaseDocument {
    name: string;
    description?: string;
    image?: string;
}

export interface ISurfaceFinish extends BaseDocument {
    name: 'Prefabricated' | 'Formica Laminated' | 'Paint';
    description?: string;
    image?: string;
}

export interface IHardware extends BaseDocument {
    name: string;
    description?: string;
    image?: string;
}

export interface ISeries extends BaseDocument {
    name: string;
    description?: string;
    image?: string;
}

// Composite materials interfaces
export interface IBoard extends BaseDocument {
    name: string;
    baseMaterial: Types.ObjectId | IBaseMaterial;
    brand: Types.ObjectId | IBrand;
    surfaceFinish: Types.ObjectId | ISurfaceFinish;
    thickness: Types.ObjectId | IThickness;
    unitPrice: number;
    sqftInSingleUnit: number;
    sqftPrice: number;
    image?: string;
    description?: string;
}

export interface IEdging extends BaseDocument {
    name: string;
    catagory: 'PVC' | 'Acrylic' | 'Aluminium' | 'Melamine' | 'Wood Veneer' | 'ABS' | 'Other';
    thickness: Types.ObjectId | IThickness;
    image?: string;
}

// Product related interfaces
export interface IConfig {
    board: Types.ObjectId | IBoard;
    edging: Types.ObjectId | IEdging;
    surface: Types.ObjectId | ISurface;
}

export interface ISeriesSpecification {
    series: Types.ObjectId | ISeries;
    surface: Types.ObjectId | ISurface;
    configs: {
        front?: IConfig;
        bodyStructure?: IConfig;
    };
    hasFront: boolean;
    hasBodyStructure: boolean;
    hardware: Types.ObjectId | IHardware;
    durability: number;
    waterResistant: number;
    scratchResistant: number;
    screwHoldingCapacity: number;
    warranty: number;
    pricePerSqFt: number;
    images?: string[];
}

export interface IProduct extends BaseDocument {
    name: string;
    description?: string;
    specifications: ISeriesSpecification[];
    thumbnail?: string;
    productStatus: 'active' | 'inactive';
}

// Color related interfaces
export interface IPrefabricated {
    spName: string;
    brandName: string;
    board: Types.ObjectId | IBoard;
    spCode: string;
    brandCode: string;
    image?: string;
}

export interface IFormicaLaminated {
    spName: string;
    brandName: string;
    brand: Types.ObjectId | IBrand;
    spCode: string;
    brandCode: string;
    formicaCategory: {
        category: string;
        subCategory: string;
    };
    pricePerSqFt: number;
}

export interface IPaint {
    spName: string;
    brandName: string;
    brand: Types.ObjectId | IBrand;
    paintBaseType: string;
    applicationArea: string[];
    pricePerSqFt: {
        fresh: number;
        rePaint: number;
    };
}

export interface IColor extends BaseDocument {
    type: Types.ObjectId | ISurfaceFinish;
    prefabricated?: IPrefabricated;
    formicaLaminated?: IFormicaLaminated;
    paint?: IPaint;
}