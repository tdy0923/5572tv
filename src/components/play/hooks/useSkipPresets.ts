import {
  type ChangeEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { secondsToTime, timeToSeconds } from '@/lib/time-utils';

export interface SkipPreset {
  id: string;
  name: string;
  openingEnd: number;
  endingStart: number;
}

const SKIP_PRESETS_KEY = '5572tv_skip_presets';
const LEGACY_SKIP_PRESETS_KEY = 'moontv_skip_presets';
const MAX_PRESET_COUNT = 20;

function sanitizePresetList(input: unknown[]): SkipPreset[] {
  return input
    .map((item): SkipPreset | null => {
      if (!item || typeof item !== 'object') return null;
      const p = item as Record<string, unknown>;
      const name = typeof p.name === 'string' ? p.name.trim().slice(0, 30) : '';
      if (!name) return null;
      const openingEnd = Math.max(0, Number(p.openingEnd) || 0);
      const endingStart = Math.max(0, Number(p.endingStart) || 0);
      if (openingEnd <= 0 && endingStart <= 0) return null;
      return {
        id: typeof p.id === 'string' && p.id ? p.id : Date.now().toString(),
        name,
        openingEnd,
        endingStart,
      };
    })
    .filter((item): item is SkipPreset => item !== null)
    .slice(0, MAX_PRESET_COUNT);
}

function loadSkipPresets(): SkipPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw =
      localStorage.getItem(SKIP_PRESETS_KEY) ||
      localStorage.getItem(LEGACY_SKIP_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sanitizePresetList(parsed) : [];
  } catch {
    return [];
  }
}

function saveSkipPresetsToStorage(presets: SkipPreset[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    SKIP_PRESETS_KEY,
    JSON.stringify(presets.slice(0, MAX_PRESET_COUNT)),
  );
}

interface BatchSettings {
  openingStart: string;
  openingEnd: string;
  endingMode: string;
  endingStart: string;
  endingEnd: string;
  autoSkip: boolean;
  autoNextEpisode: boolean;
}

interface UseSkipPresetsOptions {
  batchSettings: BatchSettings;
  setBatchSettings: React.Dispatch<React.SetStateAction<BatchSettings>>;
}

export function useSkipPresets({
  batchSettings,
  setBatchSettings,
}: UseSkipPresetsOptions) {
  const [skipPresets, setSkipPresets] = useState<SkipPreset[]>(loadSkipPresets);
  const [newPresetName, setNewPresetName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [pendingImportedPresets, setPendingImportedPresets] = useState<
    SkipPreset[]
  >([]);
  const [presetFeedback, setPresetFeedback] = useState('');
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!presetFeedback) return;
    const timer = setTimeout(() => setPresetFeedback(''), 3000);
    return () => clearTimeout(timer);
  }, [presetFeedback]);

  const handleCreatePreset = useCallback(() => {
    const name = newPresetName.trim().slice(0, 30);
    if (!name) {
      setPresetFeedback('Please enter a preset name');
      return;
    }
    if (skipPresets.length >= MAX_PRESET_COUNT) {
      setPresetFeedback(`Max ${MAX_PRESET_COUNT} presets allowed`);
      return;
    }
    if (skipPresets.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setPresetFeedback('Preset name already exists');
      return;
    }
    const openingEnd = timeToSeconds(batchSettings.openingEnd);
    const endingStart =
      batchSettings.endingMode === 'remaining'
        ? timeToSeconds(batchSettings.endingStart)
        : 0;
    if (openingEnd <= 0 && endingStart <= 0) {
      setPresetFeedback('Opening and ending are both 0, cannot create preset');
      return;
    }
    const preset: SkipPreset = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      openingEnd,
      endingStart,
    };
    const updated = [...skipPresets, preset];
    setSkipPresets(updated);
    saveSkipPresetsToStorage(updated);
    setNewPresetName('');
    setSelectedPresetId(preset.id);
    setPresetFeedback(`Created preset "${name}"`);
  }, [newPresetName, skipPresets, batchSettings]);

  const handleApplyPreset = useCallback(() => {
    const preset = skipPresets.find((p) => p.id === selectedPresetId);
    if (!preset) {
      setPresetFeedback('Please select a preset first');
      return;
    }
    setBatchSettings((prev) => ({
      ...prev,
      openingStart: '0:00',
      openingEnd: secondsToTime(preset.openingEnd),
      endingMode: 'remaining',
      endingStart:
        preset.endingStart > 0
          ? secondsToTime(preset.endingStart)
          : prev.endingStart,
      endingEnd: '',
    }));
    setPresetFeedback(`Applied preset "${preset.name}"`);
  }, [skipPresets, selectedPresetId, setBatchSettings]);

  const handleDeletePreset = useCallback(() => {
    if (!selectedPresetId) {
      setPresetFeedback('Please select a preset first');
      return;
    }
    const preset = skipPresets.find((p) => p.id === selectedPresetId);
    const updated = skipPresets.filter((p) => p.id !== selectedPresetId);
    setSkipPresets(updated);
    saveSkipPresetsToStorage(updated);
    setSelectedPresetId(updated[0]?.id || '');
    if (preset) setPresetFeedback(`Deleted preset "${preset.name}"`);
  }, [skipPresets, selectedPresetId]);

  const handleUpdatePreset = useCallback(() => {
    const preset = skipPresets.find((p) => p.id === selectedPresetId);
    if (!preset) {
      setPresetFeedback('Please select a preset first');
      return;
    }
    const openingEnd = timeToSeconds(batchSettings.openingEnd);
    const endingStart =
      batchSettings.endingMode === 'remaining'
        ? timeToSeconds(batchSettings.endingStart)
        : 0;
    const updated = skipPresets.map((p) =>
      p.id === selectedPresetId ? { ...p, openingEnd, endingStart } : p,
    );
    setSkipPresets(updated);
    saveSkipPresetsToStorage(updated);
    setPresetFeedback(`Updated preset "${preset.name}"`);
  }, [skipPresets, selectedPresetId, batchSettings]);

  const handleExportPresets = useCallback(() => {
    if (skipPresets.length === 0) {
      setPresetFeedback('No presets to export');
      return;
    }
    const payload = JSON.stringify(skipPresets, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `5572tv-skip-presets-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setPresetFeedback('Presets exported');
  }, [skipPresets]);

  const handleImportPresets: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      file.text().then((text) => {
        try {
          const parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) {
            setPresetFeedback('Import failed: invalid file format');
            return;
          }
          const imported = sanitizePresetList(parsed);
          if (imported.length === 0) {
            setPresetFeedback('Import failed: no valid presets found');
            return;
          }
          setPendingImportedPresets(imported);
          setIsImportDialogOpen(true);
        } catch {
          setPresetFeedback('Import failed: cannot parse file');
        }
      });
      event.target.value = '';
    },
    [],
  );

  const handleConfirmImport = useCallback(
    (mode: 'merge' | 'overwrite') => {
      const byName = (name: string) => name.trim().toLowerCase();

      const finalPresets =
        mode === 'overwrite'
          ? sanitizePresetList(pendingImportedPresets)
          : sanitizePresetList([
              ...pendingImportedPresets,
              ...skipPresets.filter(
                (local) =>
                  !pendingImportedPresets.some(
                    (imp) =>
                      imp.id === local.id ||
                      byName(imp.name) === byName(local.name),
                  ),
              ),
            ]);

      setSkipPresets(finalPresets);
      saveSkipPresetsToStorage(finalPresets);
      setSelectedPresetId(finalPresets[0]?.id || '');
      setPresetFeedback(`Imported ${pendingImportedPresets.length} presets`);
      setPendingImportedPresets([]);
      setIsImportDialogOpen(false);
    },
    [pendingImportedPresets, skipPresets],
  );

  return {
    skipPresets,
    newPresetName,
    setNewPresetName,
    selectedPresetId,
    setSelectedPresetId,
    isImportDialogOpen,
    setIsImportDialogOpen,
    pendingImportedPresets,
    setPendingImportedPresets,
    presetFeedback,
    importInputRef,
    handleCreatePreset,
    handleApplyPreset,
    handleDeletePreset,
    handleUpdatePreset,
    handleExportPresets,
    handleImportPresets,
    handleConfirmImport,
    MAX_PRESET_COUNT,
  };
}
