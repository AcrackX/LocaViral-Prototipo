import { GoogleGenAI } from "@google/genai";
import { AdGenerationResult } from "../types";

// Ensure API key is available
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Generates a dynamic follow-up question based on the initial product description.
 */
export const generateFollowUpQuestion = async (description: string, imageBase64: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key missing");

  try {
    const prompt = `
      Você é um especialista em vendas.
      Produto: "${description}".
      
      Analise a descrição e a imagem. Crie UMA ÚNICA pergunta curta para descobrir um detalhe técnico essencial que falta (ex: sabores, voltagem, marca).
      Retorne APENAS a pergunta.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
            role: 'user',
            parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
            ]
        }
      ],
    });

    return response.text?.trim() || "Quais são as variações ou modelos disponíveis?";
  } catch (error) {
    console.error("Error generating question:", error);
    return "Poderia dar mais detalhes técnicos sobre o produto?";
  }
};

/**
 * Searches for current design trends for the specific product to emulate platforms like Designi.
 */
const getDesignTrends = async (description: string): Promise<string> => {
    // Optimization: Skip search for known templates like Bolo de Pote to ensure brand consistency
    const normalizedDesc = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    if (normalizedDesc.includes("bolo de pote") || normalizedDesc.includes("bolo no pote")) {
        console.log("Template Detectado: Bolo de Pote V1");
        return "TEMPLATE_BOLO_POTE_V1"; 
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `
                Primeiro, identifique o produto principal nesta descrição: "${description}".
                Em seguida, pesquise no Google EXATAMENTE com a query: "post [PRODUTO] site:designi.com.br"
                (Exemplo: se for bolo, pesquise "post bolo de pote site:designi.com.br")

                Analise os snippets e títulos dos resultados para identificar o estilo visual (cores, fundos, elementos) que está em alta no Designi.
                
                Retorne APENAS um parágrafo curto de "Direção de Arte" técnica para um designer recriar esse estilo:
                1. Paleta de cores.
                2. Iluminação/Fundo.
                3. Elementos chave.
            `,
            config: {
                tools: [{ googleSearch: {} }], // Enable Google Search grounding
            }
        });
        
        const trend = response.text?.trim();
        console.log("Design Trend Found:", trend);
        return trend || "Estilo moderno, clean, fundo sólido e iluminação de estúdio.";
    } catch (error) {
        console.error("Error fetching design trends:", error);
        return "Estilo comercial high-end, iluminação de estúdio profissional, fundo neutro.";
    }
};

/**
 * Generates the ad copy and initiates banner generation.
 */
export const generateCampaign = async (
  data: {
    description: string;
    dynamicQuestion: string;
    dynamicAnswer: string;
    price: string;
    contactPhone: string;
    delivery: boolean;
    location: string;
    productImage: string;
  }
): Promise<AdGenerationResult> => {
  if (!apiKey) throw new Error("API Key missing");

  // 0. Get Design Trends (Parallel with copy generation to save time if desired, but sequential for logic clarity)
  // We do it first to feed into the image prompt
  const designTrendPromise = getDesignTrends(data.description);

  // 1. Generate Copy - SHORT & DIRECT
  const copyPrompt = `
    Crie UM ÚNICO texto de anúncio curto e direto para Facebook/OLX.
    Foco: Venda rápida, urgência e clareza. Nada de enrolação.
    
    Produto: ${data.description}
    Detalhes: ${data.dynamicAnswer}
    Preço: ${data.price}
    Local: ${data.location}
    Entrega: ${data.delivery ? "Sim" : "Não"}
    Zap: ${data.contactPhone}
    
    Formato Obrigatório:
    [Headline Curta e Impactante]
    
    [3 Bullet points com os principais benefícios/detalhes]
    
    💰 Apenas ${data.price}
    📍 ${data.location} | 🚚 ${data.delivery ? "Entregamos" : "Retirada"}
    📲 Chame agora: ${data.contactPhone}
    
    Sem hashtags. Sem introdução.
  `;

  const copyPromise = ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: copyPrompt,
  });

  const [designTrend, copyResponse] = await Promise.all([designTrendPromise, copyPromise]);
  const generatedCopy = copyResponse.text || "Erro ao gerar texto.";

  // 2. Generate Banners (Nano Banana / Gemini 2.5 Flash Image)
  
  // Clean Square (Feed 1:1) - Just the product, improved
  const squareBannerPromise = generateBanner(data.productImage, data.description, "clean-square");
  
  // Clean Story (Vertical 9:16) - Just the product, improved
  const storyBannerPromise = generateBanner(data.productImage, data.description, "clean-story");

  // Designed Banner (Feed 1:1) - "Social Media Art" style WITH TRENDS
  const designBannerPromise = generateBanner(
      data.productImage, 
      data.description, 
      "design-square", 
      data.contactPhone, 
      data.price,
      designTrend // Pass the discovered trend
  );

  const [bannerSquare, bannerStory, bannerDesign] = await Promise.all([squareBannerPromise, storyBannerPromise, designBannerPromise]);

  return {
    copy: generatedCopy,
    bannerSquare,
    bannerStory,
    bannerDesign
  };
};

/**
 * Helper to generate banners
 */
async function generateBanner(
    imageBase64: string, 
    description: string, 
    type: "clean-square" | "clean-story" | "design-square",
    contactInfo?: string,
    price?: string,
    designTrend?: string
): Promise<string> {
    try {
        let prompt = "";
        
        if (type === "clean-square") {
            prompt = `
              Edit this product image to look like a high-end e-commerce photo.
              Ratio: 1:1 Square.
              Action: Remove background distractions, improve lighting, make the product pop. 
              Background: Clean, neutral, professional studio setting appropriate for: "${description}".
              No text overlay.
            `;
        } else if (type === "clean-story") {
            prompt = `
              Edit this product image for an Instagram Story background.
              Ratio: 9:16 Vertical.
              Action: Center the product, extend the background seamlessly top and bottom.
              Style: Aesthetic, clean, minimalist.
              No text overlay.
            `;
        } else if (type === "design-square") {
            // Check if we hit the "Bolo de Pote" template trigger
            if (designTrend === "TEMPLATE_BOLO_POTE_V1") {
                // SPECIAL TEMPLATE: BOLO DE POTE V1
                // This mimics the reference image: Red background, hearts, jute mat, strawberries.
                prompt = `
                    Act as a Senior Art Director. 
                    Task: Create a promotional ad for "Bolo de Pote" (Cake in a Jar) following a STRICT BRAND TEMPLATE.

                    [BRAND VISUAL IDENTITY - "Bolo de Pote V1"]
                    - Background: Deep Burgundy/Wine Red texture (rich, premium, romantic).
                    - Elements: 3D Glossy Hearts (Rose Gold/Pink) floating in the background with depth of field.
                    - Base: A rustic beige jute/burlap fabric mat where the product sits.
                    - Props: Fresh, vibrant red strawberries scattered near the base of the jar.
                    - Badge: A gold seal/sticker on the left side.

                    [PRODUCT INTEGRATION]
                    - Input Image: Use the cake jar from the provided image.
                    - Action: Place the jar centrally on the jute mat. Enhance its layers to look delicious and creamy. Lighting should be soft and warm.

                    [TEXT OVERLAY - RENDER THIS TEXT CLEARLY]
                    - Top Title: "Experimente nosso" (Small, Elegant Serif, White)
                    - Main Title: "Bolo de Pote" (Large, Elegant Serif, White/Cream)
                    - Call to Action: "PEÇA JÁ! ${contactInfo}" (Bottom, Bold, White)
                    - Price Tag (if fits): "${price}"

                    Ensure the final image looks like a high-end confectionery flyer.
                `;
            } else {
                // GENERIC / SEARCH-BASED GENERATION
                prompt = `
                  Act as a Senior Art Director. Create a high-conversion social media ad.

                  [INPUT PRODUCT]
                  Keep the product from the image exactly as is, but enhance sharpness and lighting.

                  [ART DIRECTION & TRENDS]
                  Apply this specific visual style found in top-performing ads for this niche:
                  "${designTrend}"

                  [CORE PRINCIPLES]
                  - Lighting: Key light (softbox) + Rim light (backlight) for 3D separation. NO flat lighting.
                  - Composition: Leave negative space for text. Clean, no clutter.
                  - Quality: 8k, Octane Render style, Commercial Photography.

                  [TEXT OVERLAY]
                  Integrate these details naturally into the composition (do not cover the product):
                  - Price: "${price}"
                  - Contact: "${contactInfo}"

                  Make it look like a paid template from Designi or Canva.
                `;
            }
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // Nano banana model
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: imageBase64
                        }
                    },
                    { text: prompt }
                ]
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        
        console.warn("No image data in response", response);
        return imageBase64; 

    } catch (e) {
        console.error(`Error generating ${type} banner:`, e);
        return imageBase64;
    }
}