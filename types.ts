export interface WizardState {
  step: number;
  isLoading: boolean;
  loadingMessage: string;
  progress: number; // 0 to 100
  data: {
    productImage: string | null; // Base64
    description: string;
    dynamicQuestion: string | null;
    dynamicAnswer: string;
    price: string;
    contactPhone: string;
    delivery: boolean;
    location: string;
  };
  results: {
    copy: string | null;
    bannerSquare: string | null; // Base64
    bannerStory: string | null; // Base64
    bannerDesign: string | null; // Base64 - New "Art" banner
  } | null;
}

export enum Step {
  HOME = 0,
  DESCRIPTION = 1,
  DYNAMIC_QUESTION = 2,
  TECHNICAL_DETAILS = 3,
  PROCESSING = 4,
  RESULTS = 5
}

export interface AdGenerationResult {
  copy: string;
  bannerSquare: string; // Base64
  bannerStory: string; // Base64
  bannerDesign: string; // Base64
}