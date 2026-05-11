import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { settingsService } from '@/infrastructure/container';
import type { CardSettings, CompanyInfo, TaxSettings } from '@/types/settings';

export const settingsKeys = {
  card:    ['settings', 'card']    as const,
  company: ['settings', 'company'] as const,
  tax:     ['settings', 'tax']     as const,
};

export function useCompanySettings() {
  const qc = useQueryClient();

  const cardQuery   = useQuery({ queryKey: settingsKeys.card,    queryFn: () => settingsService.getCardSettings()   });
  const companyQuery = useQuery({ queryKey: settingsKeys.company, queryFn: () => settingsService.getCompanyInfo()   });
  const taxQuery    = useQuery({ queryKey: settingsKeys.tax,     queryFn: () => settingsService.getTaxSettings()    });

  const updateCard = useMutation({
    mutationFn: (updates: Partial<CardSettings>) => settingsService.updateCardSettings(updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.card }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCompany = useMutation({
    mutationFn: (updates: Partial<CompanyInfo>) => settingsService.updateCompanyInfo(updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.company });
      toast.success('Información actualizada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTax = useMutation({
    mutationFn: (updates: Partial<TaxSettings>) => settingsService.updateTaxSettings(updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.tax }),
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    cardSettings:   cardQuery.data,
    companyInfo:    companyQuery.data,
    taxSettings:    taxQuery.data,
    isLoading:      cardQuery.isLoading || companyQuery.isLoading || taxQuery.isLoading,
    updateCardSettings:   updateCard.mutate,
    updateCompanyInfo:    updateCompany.mutate,
    updateTaxSettings:    updateTax.mutate,
  };
}
