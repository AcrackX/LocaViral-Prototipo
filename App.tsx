import React, { useState, useEffect, useRef } from 'react';
import { WizardState, Step } from './types';
import { generateFollowUpQuestion, generateCampaign } from './services/geminiService';
import { Button } from './components/ui/Button';
import { Input, TextArea } from './components/ui/Input';
import { FileUpload } from './components/FileUpload';

// --- SVGs ---
const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M50 0L93.3013 25V75L50 100L6.69873 75V25L50 0Z" fill="#262626"/>
    <path d="M50 10L84.641 30V70L50 90L15.359 70V30L50 10Z" stroke="#ccff00" strokeWidth="4"/>
    <path d="M50 25L71.6506 37.5V62.5L50 75L28.3494 62.5V37.5L50 25Z" fill="#ccff00"/>
  </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5" />
  </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 9.75l-3 3m0 0l3 3m-3-3H21" />
    </svg>
);

// --- HELPER to strip Base64 prefix for API ---
const stripBase64Prefix = (base64: string): string => {
  return base64.replace(/^data:image\/[a-z]+;base64,/, "");
};

// --- APP COMPONENT ---
export default function App() {
  const [state, setState] = useState<WizardState>({
    step: Step.HOME,
    isLoading: false,
    loadingMessage: '',
    progress: 0,
    data: {
      productImage: null,
      description: '',
      dynamicQuestion: null,
      dynamicAnswer: '',
      price: '',
      contactPhone: '',
      delivery: false,
      location: '',
    },
    results: null
  });
  
  // Scroll to top on step change
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.step]);

  // Progress Bar Simulation Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (state.isLoading) {
      // Reset progress when loading starts
      setState(prev => ({ ...prev, progress: 5 }));
      
      interval = setInterval(() => {
        setState(prev => {
          // If we are still loading, increment progress slowly
          // We cap it at 95% until the actual data comes back
          if (prev.progress >= 95) return prev;
          
          // Move faster at the beginning, slower at the end
          const increment = prev.progress < 40 ? 2 : prev.progress < 70 ? 1 : 0.5;
          return { ...prev, progress: prev.progress + increment };
        });
      }, 150); // Update every 150ms
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.isLoading]);

  const updateData = (key: keyof typeof state.data, value: any) => {
    setState(prev => ({ ...prev, data: { ...prev.data, [key]: value } }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get only digits
    const rawValue = e.target.value.replace(/\D/g, '');
    
    if (!rawValue) {
      updateData('price', '');
      return;
    }

    // Convert to float (cents)
    const amount = parseInt(rawValue, 10) / 100;
    
    // Format BRL
    const formatted = amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    
    updateData('price', formatted);
  };

  const handleStart = () => {
    setState(prev => ({ ...prev, step: Step.DESCRIPTION }));
  };

  const handleGoToStep2 = async () => {
    if (!state.data.description || !state.data.productImage) {
      alert("Por favor, adicione uma foto e descrição.");
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, loadingMessage: 'Analisando seu produto com IA...' }));
    
    try {
      const question = await generateFollowUpQuestion(
          state.data.description, 
          stripBase64Prefix(state.data.productImage)
      );
      updateData('dynamicQuestion', question);
      setState(prev => ({ ...prev, isLoading: false, step: Step.DYNAMIC_QUESTION }));
    } catch (error) {
      console.error(error);
      // Fallback
      updateData('dynamicQuestion', 'Quais os principais diferenciais deste produto?');
      setState(prev => ({ ...prev, isLoading: false, step: Step.DYNAMIC_QUESTION }));
    }
  };

  const handleGoToStep3 = () => {
      if(!state.data.dynamicAnswer || !state.data.price) return;
      setState(prev => ({ ...prev, step: Step.TECHNICAL_DETAILS }));
  };

  const handleGenerate = async () => {
    if (!state.data.contactPhone || !state.data.location) {
        alert("Preencha os dados de contato.");
        return;
    }

    setState(prev => ({ ...prev, isLoading: true, loadingMessage: 'Criando arte viral e copy persuasiva...' }));

    try {
        const results = await generateCampaign({
            ...state.data,
            productImage: stripBase64Prefix(state.data.productImage!)
        });
        
        // Force progress to 100% just before showing results (visual polish)
        setState(prev => ({ ...prev, progress: 100 }));

        // Small delay to let the user see 100%
        setTimeout(() => {
            setState(prev => ({ 
                ...prev, 
                isLoading: false, 
                results: {
                    copy: results.copy,
                    bannerSquare: `data:image/jpeg;base64,${results.bannerSquare}`,
                    bannerStory: `data:image/jpeg;base64,${results.bannerStory}`,
                    bannerDesign: `data:image/jpeg;base64,${results.bannerDesign}`
                },
                step: Step.RESULTS
            }));
        }, 500);

    } catch (error) {
        console.error(error);
        alert("Ocorreu um erro ao gerar o anúncio. Tente novamente.");
        setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // --- RENDERERS ---

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 fade-in">
        <div className="mb-8 relative">
            <div className="absolute inset-0 bg-brand-accent blur-[60px] opacity-20 rounded-full animate-pulse"></div>
            <Logo className="w-32 h-32 relative z-10" />
        </div>
        <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight">
            Vira<span className="text-brand-accent">local</span>
        </h1>
        <p className="text-xl text-brand-muted max-w-lg mb-12 leading-relaxed">
            Transforme fotos simples de produtos em anúncios profissionais de alta conversão em segundos usando Inteligência Artificial.
        </p>
        <Button onClick={handleStart} className="text-xl px-12 py-5 shadow-[0_0_40px_rgba(204,255,0,0.2)]">
            Criar Novo Anúncio
        </Button>
    </div>
  );

  const renderStep1 = () => (
    <div className="max-w-xl mx-auto w-full fade-in">
        <h2 className="text-3xl font-bold mb-2">O que você está vendendo?</h2>
        <p className="text-brand-muted mb-8">Comece com uma foto e uma breve descrição.</p>
        
        <FileUpload 
            selectedImage={state.data.productImage} 
            onFileSelect={(base64) => updateData('productImage', base64)} 
        />
        
        <TextArea 
            label="Descrição do Produto"
            placeholder="Ex: Bolo de pote de chocolate com morango, feito hoje, super cremoso..."
            value={state.data.description}
            onChange={(e) => updateData('description', e.target.value)}
        />
        
        <div className="mt-8 sticky bottom-4 z-50">
             <Button 
                onClick={handleGoToStep2} 
                fullWidth 
                disabled={!state.data.description || !state.data.productImage}
            >
                Continuar
            </Button>
        </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="max-w-xl mx-auto w-full fade-in">
        <div className="flex items-center gap-2 mb-6 text-brand-accent">
            <span className="text-sm font-bold bg-brand-accent/10 px-3 py-1 rounded-full border border-brand-accent/20">IA Analisou seu produto</span>
        </div>
        <h2 className="text-3xl font-bold mb-6">{state.data.dynamicQuestion}</h2>
        
        <TextArea 
            placeholder="Responda aqui..."
            value={state.data.dynamicAnswer}
            onChange={(e) => updateData('dynamicAnswer', e.target.value)}
            autoFocus
            className="mb-6"
        />

        <Input 
            label="Qual o valor?"
            placeholder="R$ 0,00"
            value={state.data.price}
            onChange={handlePriceChange}
            inputMode="numeric"
        />
        
        <div className="mt-8 sticky bottom-4 z-50">
             <Button 
                onClick={handleGoToStep3} 
                fullWidth 
                disabled={!state.data.dynamicAnswer || !state.data.price}
            >
                Continuar
            </Button>
        </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="max-w-xl mx-auto w-full fade-in">
        <h2 className="text-3xl font-bold mb-2">Detalhes Finais</h2>
        <p className="text-brand-muted mb-8">Informações para o cliente te encontrar.</p>
        
        <div className="space-y-6">
            <Input 
                label="WhatsApp / Telefone"
                placeholder="(00) 00000-0000"
                value={state.data.contactPhone}
                onChange={(e) => updateData('contactPhone', e.target.value)}
            />
            
            <Input 
                label="Bairro / Cidade"
                placeholder="Ex: Centro, São Paulo"
                value={state.data.location}
                onChange={(e) => updateData('location', e.target.value)}
            />
            
            <div className="flex items-center justify-between bg-brand-surface p-4 rounded-xl border-2 border-brand-dark cursor-pointer" onClick={() => updateData('delivery', !state.data.delivery)}>
                <span className="font-medium text-lg">Faz entrega?</span>
                <div className={`w-14 h-8 rounded-full flex items-center px-1 transition-colors ${state.data.delivery ? 'bg-brand-accent' : 'bg-brand-dark'}`}>
                    <div className={`w-6 h-6 rounded-full bg-white transition-transform ${state.data.delivery ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </div>
            </div>
        </div>
        
        <div className="mt-8 sticky bottom-4 z-50">
             <Button 
                onClick={handleGenerate} 
                fullWidth 
                disabled={!state.data.contactPhone || !state.data.location}
            >
                Gerar Anúncio Viral
            </Button>
        </div>
    </div>
  );

  const renderLoading = () => {
    // Dynamic loading text based on progress
    let loadingText = state.loadingMessage;
    if (state.step === Step.PROCESSING || state.step === Step.TECHNICAL_DETAILS) {
        if (state.progress < 20) loadingText = "Pesquisando tendências no Designi...";
        else if (state.progress < 50) loadingText = "Escrevendo copy persuasiva...";
        else if (state.progress < 80) loadingText = "Ajustando iluminação de estúdio (IA)...";
        else loadingText = "Finalizando renderização 8k...";
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center fade-in max-w-md mx-auto">
            <div className="relative w-24 h-24 mb-8">
                 <div className="absolute inset-0 border-4 border-brand-dark rounded-full"></div>
                 {/* Spinner removed in favor of progress bar, but kept subtle pulsing logo */}
                 <Logo className="absolute inset-0 w-12 h-12 m-auto animate-pulse" />
            </div>
            
            <h3 className="text-2xl font-bold mb-6 text-brand-text">{loadingText}</h3>
            
            {/* Progress Bar Container */}
            <div className="w-full h-3 bg-brand-surface rounded-full overflow-hidden border border-brand-dark shadow-inner relative">
                {/* Progress Fill */}
                <div 
                    className="h-full bg-brand-accent shadow-[0_0_15px_rgba(204,255,0,0.6)] transition-all duration-300 ease-out"
                    style={{ width: `${state.progress}%` }}
                ></div>
            </div>
            <p className="text-brand-muted mt-2 text-sm font-mono">{Math.round(state.progress)}%</p>
        </div>
    );
  };

  const renderResults = () => {
    if (!state.results) return null;
    
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copiado!");
    };

    const downloadImage = (base64: string, name: string) => {
        const link = document.createElement('a');
        link.href = base64;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-5xl mx-auto w-full fade-in pb-20">
            <div className="text-center mb-10">
                <h2 className="text-4xl font-black text-brand-accent mb-2">Anúncio Gerado! 🚀</h2>
                <p className="text-brand-muted">Use as versões abaixo para diferentes redes.</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 mb-12">
                
                {/* Column 1: Copy */}
                <div className="lg:col-span-1 order-1 lg:order-1">
                     <div className="bg-brand-surface p-6 rounded-2xl border border-brand-dark sticky top-4">
                        <div className="flex justify-between items-center mb-4 border-b border-brand-dark pb-4">
                            <h3 className="font-bold text-lg text-white">Legenda (Copy)</h3>
                             <button 
                                    onClick={() => copyToClipboard(state.results!.copy!)}
                                    className="bg-brand-dark hover:bg-gray-700 text-brand-text p-2 rounded-lg flex items-center justify-center transition-colors"
                                    title="Copiar"
                                >
                                    <CopyIcon />
                            </button>
                        </div>
                        <div className="whitespace-pre-wrap text-brand-text/90 leading-relaxed font-sans text-sm">
                            {state.results.copy}
                        </div>
                    </div>
                </div>

                {/* Column 2 & 3: Images */}
                <div className="lg:col-span-2 order-2 lg:order-2 space-y-8">
                    
                    {/* Featured Design */}
                    <div className="bg-gradient-to-br from-brand-surface to-brand-dark p-6 rounded-2xl border border-brand-accent/30 shadow-[0_0_30px_rgba(204,255,0,0.05)]">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-xl text-brand-accent flex items-center gap-2">
                                    ✨ Arte Social Media
                                </h3>
                                <p className="text-sm text-brand-muted">Pronta para postar no Feed</p>
                            </div>
                            <button 
                                onClick={() => downloadImage(state.results!.bannerDesign!, 'viralocal-design.jpg')}
                                className="bg-brand-accent text-brand-black px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold hover:scale-105 transition-transform"
                            >
                                <DownloadIcon /> Baixar Arte
                            </button>
                        </div>
                        <img src={state.results.bannerDesign!} className="w-full aspect-square rounded-xl object-cover shadow-lg" alt="Arte Design" />
                    </div>

                    {/* Clean Versions Grid */}
                    <div className="grid md:grid-cols-2 gap-4">
                         {/* Clean Square */}
                        <div className="bg-brand-surface p-4 rounded-xl border border-brand-dark">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-sm text-brand-muted">Foto Clean (1:1)</h3>
                                <button 
                                    onClick={() => downloadImage(state.results!.bannerSquare!, 'viralocal-clean-feed.jpg')}
                                    className="text-brand-text hover:text-brand-accent transition-colors"
                                >
                                    <DownloadIcon />
                                </button>
                            </div>
                            <img src={state.results.bannerSquare!} className="w-full aspect-square rounded-lg object-cover" alt="Clean Feed" />
                        </div>

                        {/* Clean Story */}
                        <div className="bg-brand-surface p-4 rounded-xl border border-brand-dark">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-sm text-brand-muted">Story (9:16)</h3>
                                <button 
                                    onClick={() => downloadImage(state.results!.bannerStory!, 'viralocal-clean-story.jpg')}
                                    className="text-brand-text hover:text-brand-accent transition-colors"
                                >
                                    <DownloadIcon />
                                </button>
                            </div>
                            <div className="flex justify-center h-48 md:h-64">
                                <img src={state.results.bannerStory!} className="h-full w-auto aspect-[9/16] rounded-lg object-cover" alt="Clean Story" />
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <div className="text-center">
                <Button onClick={() => window.location.reload()} variant="outline">
                    Criar Outro Anúncio
                </Button>
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-black text-brand-text font-sans selection:bg-brand-accent selection:text-brand-black" ref={topRef}>
      {/* Header */}
      <header className="p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <Logo className="w-8 h-8" />
            <span className="font-bold text-xl tracking-tight">Vira<span className="text-brand-accent">local</span></span>
        </div>
        {state.step > Step.HOME && state.step < Step.RESULTS && (
            <div className="flex gap-2">
                {[1, 2, 3].map(i => (
                    <div 
                        key={i} 
                        className={`w-3 h-3 rounded-full transition-colors ${state.step >= i ? 'bg-brand-accent' : 'bg-brand-surface'}`}
                    />
                ))}
            </div>
        )}
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto w-full">
        {state.isLoading && renderLoading()}
        
        {!state.isLoading && (
            <>
                {state.step === Step.HOME && renderHome()}
                {state.step === Step.DESCRIPTION && renderStep1()}
                {state.step === Step.DYNAMIC_QUESTION && renderStep2()}
                {state.step === Step.TECHNICAL_DETAILS && renderStep3()}
                {state.step === Step.RESULTS && renderResults()}
            </>
        )}
      </main>
    </div>
  );
}