import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  Brain,
  Zap,
  Eye,
  Cpu,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "../../utils/cn";
import { ScrollLock } from "../../hooks/useScrollLock";
import {
  AIProvider,
  ModelOption,
  getAllModels,
  getModelsByProvider,
} from "../../types/aiService";

interface ModelSelectorProps {
  selectedModel?: string;
  onModelSelect: (modelId: string) => void;
  provider?: AIProvider;
  showAllProviders?: boolean;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  showPricing?: boolean;
  showCapabilities?: boolean;
  compact?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelSelect,
  provider,
  showAllProviders = false,
  className,
  disabled = false,
  placeholder,
  showPricing = true,
  showCapabilities = true,
  compact = false,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModelInfo, setSelectedModelInfo] =
    useState<ModelOption | null>(null);
  const placeholderText = placeholder ?? t("modelSelector.placeholder");

  useEffect(() => {
    if (showAllProviders) {
      setModels(getAllModels());
    } else if (provider) {
      setModels(getModelsByProvider(provider));
    } else {
      setModels([]);
    }
  }, [provider, showAllProviders]);

  useEffect(() => {
    if (selectedModel) {
      const modelInfo = models.find((m) => m.id === selectedModel);
      setSelectedModelInfo(modelInfo || null);
    } else {
      setSelectedModelInfo(null);
    }
  }, [selectedModel, models]);

  const getProviderIcon = (provider: AIProvider) => {
    switch (provider) {
      case "openai":
        return <Brain className="w-4 h-4" />;
      case "gemini":
        return <Zap className="w-4 h-4" />;
      case "grok":
        return <Eye className="w-4 h-4" />;
      case "opencode":
        return <Cpu className="w-4 h-4" />;
      default:
        return <Cpu className="w-4 h-4" />;
    }
  };

  const getProviderColor = (provider: AIProvider) => {
    switch (provider) {
      case "openai":
        return "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400";
      case "gemini":
        return "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400";
      case "grok":
        return "bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400";
      case "opencode":
        return "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400";
      default:
        return "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const formatPrice = (price: number) => {
    if (price < 1) {
      return `$${price.toFixed(3)}`;
    }
    return `$${price.toFixed(2)}`;
  };

  const hasPricing = (model: ModelOption) =>
    model.pricing.input > 0 || model.pricing.output > 0;

  const hasContextWindow = (model: ModelOption) => model.contextWindow > 0;

  const getCapabilityIcon = (capability: string) => {
    switch (capability) {
      case "vision":
        return <Eye className="w-3 h-3" />;
      case "audio":
        return <Cpu className="w-3 h-3" />;
      case "video":
        return <Cpu className="w-3 h-3" />;
      case "function-calling":
        return <Cpu className="w-3 h-3" />;
      case "reasoning":
        return <Brain className="w-3 h-3" />;
      case "thinking":
        return <Brain className="w-3 h-3" />;
      default:
        return <CheckCircle className="w-3 h-3" />;
    }
  };

  const getCapabilityLabel = (capability: string) =>
    t(`modelSelector.capabilities.${capability}`, capability);

  const groupedModels = models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<AIProvider, ModelOption[]>);

  const handleSelect = (modelId: string) => {
    onModelSelect(modelId);
    setOpen(false);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:ring-offset-gray-950 dark:hover:bg-gray-900",
            !selectedModelInfo && "text-gray-500 dark:text-gray-400",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            {selectedModelInfo ? (
              <>
                <div
                  className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0",
                    getProviderColor(selectedModelInfo.provider)
                  )}
                >
                  {getProviderIcon(selectedModelInfo.provider)}
                  {selectedModelInfo.provider.toUpperCase()}
                </div>
                <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedModelInfo.name}
                </span>
                {showPricing && !compact && hasPricing(selectedModelInfo) && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 hidden sm:inline">
                    {t("modelSelector.pricePerMillion", { price: formatPrice(selectedModelInfo.pricing.input) })}
                  </span>
                )}
              </>
            ) : (
              <span>{placeholderText}</span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "ml-2 h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={16}
          avoidCollisions
          className={cn(
            "z-[100] w-[min(480px,90vw)] max-h-[min(500px,70vh)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-xl outline-none animate-in data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 dark:border-gray-700 dark:bg-gray-950",
            "thin-scrollbar"
          )}
        >
          <ScrollLock />
          {Object.entries(groupedModels).map(
            ([providerKey, providerModels]) => (
              <div key={providerKey}>
                {showAllProviders && (
                  <div className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50/95 px-3 py-2 text-xs font-semibold text-gray-500 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-800/95 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      {getProviderIcon(providerKey as AIProvider)}
                      {providerKey.toUpperCase()}
                    </div>
                  </div>
                )}
                {providerModels.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleSelect(model.id)}
                    className={cn(
                      "w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900",
                      selectedModel === model.id &&
                        "bg-primary-50 dark:bg-primary-950/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {!showAllProviders && (
                            <div
                              className={cn(
                                "flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-semibold shrink-0",
                                getProviderColor(model.provider)
                              )}
                            >
                              {getProviderIcon(model.provider)}
                            </div>
                          )}
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {model.name}
                          </span>
                          {selectedModel === model.id && (
                            <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                          )}
                        </div>
                        {!compact && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {model.description}
                          </p>
                        )}
                        {showCapabilities && !compact && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {model.capabilities
                              .slice(0, 4)
                              .map((capability) => (
                                <span
                                  key={capability}
                                  className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                >
                                  {getCapabilityIcon(capability)}
                                  {getCapabilityLabel(capability)}
                                </span>
                              ))}
                            {model.capabilities.length > 4 && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                {t("modelSelector.moreCapabilities", {
                                  count: model.capabilities.length - 4,
                                })}
                              </span>
                            )}
                          </div>
                        )}
                        {showPricing && !compact && (hasPricing(model) || hasContextWindow(model)) && (
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                            {hasPricing(model) && (
                              <>
                                <span className="inline-flex items-center gap-0.5">
                                  <DollarSign className="w-3 h-3" />
                                  {t("modelSelector.inputPrice", {
                                    price: formatPrice(model.pricing.input),
                                  })}
                                </span>
                                <span className="inline-flex items-center gap-0.5">
                                  <DollarSign className="w-3 h-3" />
                                  {t("modelSelector.outputPrice", {
                                    price: formatPrice(model.pricing.output),
                                  })}
                                </span>
                              </>
                            )}
                            {hasContextWindow(model) && (
                              <span className="inline-flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {t("modelSelector.contextWindow", {
                                  value: (model.contextWindow / 1000).toFixed(0),
                                })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
          {models.length === 0 && (
            <div className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm">{t("modelSelector.noModels")}</p>
              {!showAllProviders && !provider && (
                <p className="text-xs mt-1">{t("modelSelector.selectProvider")}</p>
              )}
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
