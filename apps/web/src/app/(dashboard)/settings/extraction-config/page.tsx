'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useExtractionConfig, useUpdateExtractionConfig } from '@/hooks';
import { getApiErrorMessage } from '@/lib/api';
import {
  EXTRACT_FIELD_CATEGORY_LABELS,
  EXTRACT_FIELD_LABELS,
  PROVIDER_LABELS,
} from '@/types';
import type {
  CustomExtractionField,
  ExtractFieldsTree,
  ResumeParserProvider,
} from '@/types';

const PROVIDER_OPTIONS: ResumeParserProvider[] = [
  'GEMINI_FLASH', 'CLAUDE', 'OPENAI_GPT', 'AFFINDA', 'RCHILLI', 'RULE_BASED',
];

export default function ExtractionConfigPage() {
  const { data: config, isLoading, isError } = useExtractionConfig();
  const update = useUpdateExtractionConfig();

  const [preferred, setPreferred]       = useState<ResumeParserProvider>('GEMINI_FLASH');
  const [fields,    setFields]          = useState<ExtractFieldsTree>({});
  const [custom,    setCustom]          = useState<CustomExtractionField[]>([]);
  const [slaHours,  setSlaHours]        = useState<number>(24);
  const [maxBytes,  setMaxBytes]        = useState<number>(10 * 1024 * 1024);

  // Hydrate local state from server config once it arrives.
  useEffect(() => {
    if (!config) return;
    setPreferred(config.preferredProvider);
    setFields(config.extractFields);
    setCustom(config.customFields);
    setSlaHours(config.reviewSlaHours);
    setMaxBytes(config.maxFileBytes);
  }, [config]);

  const isDirty = useMemo(() => {
    if (!config) return false;
    return (
      preferred !== config.preferredProvider ||
      JSON.stringify(fields) !== JSON.stringify(config.extractFields) ||
      JSON.stringify(custom) !== JSON.stringify(config.customFields) ||
      slaHours  !== config.reviewSlaHours ||
      maxBytes  !== config.maxFileBytes
    );
  }, [config, preferred, fields, custom, slaHours, maxBytes]);

  const toggleField = (group: string, key: string) => {
    setFields((prev) => ({
      ...prev,
      [group]: { ...(prev[group] ?? {}), [key]: !(prev[group]?.[key] ?? false) },
    }));
  };

  const addCustomField = () => {
    setCustom((prev) => [
      ...prev,
      { id: `custom_${Date.now()}`, label: 'New field', group: 'Custom', type: 'TEXT' },
    ]);
  };

  const updateCustomField = (idx: number, patch: Partial<CustomExtractionField>) => {
    setCustom((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  const removeCustomField = (idx: number) => {
    setCustom((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSave = async () => {
    try {
      await update.mutateAsync({
        preferredProvider: preferred,
        extractFields:     fields,
        customFields:      custom,
        reviewSlaHours:    slaHours,
        maxFileBytes:      maxBytes,
      });
      toast.success('Extraction settings saved');
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }
  if (isError || !config) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-destructive">Failed to load extraction settings.</p>
        </CardContent>
      </Card>
    );
  }

  const categories = Object.keys({ ...EXTRACT_FIELD_LABELS, ...fields });

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Resume extraction"
        description="Choose which fields the parser pulls from uploaded resumes. Settings are applied in R2 when parsing comes online."
      />

      {config.isDefault && (
        <div className="flex gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Showing platform defaults — save once to commit them to your organization.</span>
        </div>
      )}

      {/* Provider */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Preferred parsing provider</h3>
          <p className="text-xs text-muted-foreground">
            The provider used when parsing comes online in R2. Gemini Flash is the platform default.
          </p>
          <Select value={preferred} onValueChange={(v) => setPreferred(v as ResumeParserProvider)}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Field toggles */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Fields to extract</h3>
            <p className="text-xs text-muted-foreground">
              Disabled fields are stripped before any extraction is persisted (PayloadStripper, R2).
            </p>
          </div>

          <div className="space-y-5">
            {categories.map((group) => {
              const labels = EXTRACT_FIELD_LABELS[group] ?? {};
              const groupState = fields[group] ?? {};
              const allKeys = Object.keys({ ...labels, ...groupState });
              if (allKeys.length === 0) return null;
              return (
                <div key={group} className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {EXTRACT_FIELD_CATEGORY_LABELS[group] ?? group}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {allKeys.map((key) => {
                      const checked = !!groupState[key];
                      const label = labels[key] ?? key;
                      return (
                        <label
                          key={key}
                          className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                            checked ? 'bg-primary/5 border-primary/50' : 'bg-background hover:bg-muted/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleField(group, key)}
                            className="h-4 w-4"
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom fields */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Custom fields</h3>
              <p className="text-xs text-muted-foreground">
                Recruiter-defined extra fields the parser will attempt to pull from each resume.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={addCustomField}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add field
            </Button>
          </div>
          {custom.length === 0 ? (
            <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">No custom fields configured.</p>
          ) : (
            <div className="space-y-2">
              {custom.map((field, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center rounded-md border p-2">
                  <Input
                    className="col-span-3"
                    placeholder="ID (no spaces)"
                    value={field.id}
                    onChange={(e) => updateCustomField(idx, { id: e.target.value })}
                  />
                  <Input
                    className="col-span-3"
                    placeholder="Label"
                    value={field.label}
                    onChange={(e) => updateCustomField(idx, { label: e.target.value })}
                  />
                  <Input
                    className="col-span-2"
                    placeholder="Group"
                    value={field.group}
                    onChange={(e) => updateCustomField(idx, { group: e.target.value })}
                  />
                  <Select
                    value={field.type}
                    onValueChange={(v) => updateCustomField(idx, { type: v as CustomExtractionField['type'] })}
                  >
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">Text</SelectItem>
                      <SelectItem value="NUMBER">Number</SelectItem>
                      <SelectItem value="DATE">Date</SelectItem>
                      <SelectItem value="BOOLEAN">Boolean</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="col-span-1" onClick={() => removeCustomField(idx)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operational guardrails */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Operational guardrails</h3>
          <div className="grid grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-1">
              <Label htmlFor="sla">Review SLA (hours)</Label>
              <Input id="sla" type="number" min={1} max={720} value={slaHours} onChange={(e) => setSlaHours(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxBytes">Max file size (MB)</Label>
              <Input id="maxBytes" type="number" min={1} max={50} value={Math.round(maxBytes / (1024 * 1024))} onChange={(e) => setMaxBytes(Number(e.target.value) * 1024 * 1024)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button onClick={onSave} disabled={!isDirty || update.isPending}>
          <Save className="mr-1.5 h-4 w-4" />
          {update.isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}
