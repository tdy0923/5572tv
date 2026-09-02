'use client';

import { Code2, Eye, RotateCcw, Save } from 'lucide-react';
import { useState } from 'react';

import { showError, showSuccess } from '@/app/admin/admin-utils';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentTextArea,
} from '@/components/FluentUI';

interface ThemeEditorProps {
  initialCustomCSS: string;
  onSave: (css: string) => Promise<void>;
}

const DEFAULT_CSS_REFERENCE = `/* 常用 CSS 变量 */
:root {
  --background: #ffffff;
  --foreground: #171717;
  --primary: #3b82f6;
  --secondary: #6b7280;
  --accent: #8b5cf6;
  --muted: #f3f4f6;
  --border: #e5e7eb;
}

/* 示例：修改主色调 */
/*
:root {
  --primary: #10b981;
}
*/

/* 示例：自定义背景渐变 */
/*
body {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
*/

/* 示例：自定义卡片样式 */
/*
.ui-surface {
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
*/`;

export default function ThemeEditor({
  initialCustomCSS,
  onSave,
}: ThemeEditorProps) {
  const [css, setCss] = useState(initialCustomCSS);
  const [previewCSS, setPreviewCSS] = useState('');
  const [saving, setSaving] = useState(false);
  const [showReference, setShowReference] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(css);
      showSuccess('主题已保存');
    } catch {
      showError('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    setPreviewCSS(css);
  };

  const handleClearPreview = () => {
    setPreviewCSS('');
  };

  const handleReset = () => {
    setCss('');
    setPreviewCSS('');
  };

  // CSS 注入防护：移除危险内容
  const sanitizeCSS = (css: string): string => {
    return css
      .replace(/javascript\s*:/gi, '/* blocked */')
      .replace(/expression\s*\(/gi, '/* blocked */')
      .replace(/url\s*\(\s*['"]?javascript/gi, '/* blocked */')
      .replace(/@import\s+url\s*\(/gi, '/* blocked */')
      .replace(/behavior\s*:/gi, '/* blocked */')
      .replace(/-moz-binding\s*:/gi, '/* blocked */')
      .replace(/url\s*\(\s*['"]?data\s*:/gi, '/* blocked */');
  };

  const hasPreview = Boolean(previewCSS);
  const hasChanges = css !== initialCustomCSS;

  return (
    <div className='space-y-4'>
      <style dangerouslySetInnerHTML={{ __html: sanitizeCSS(previewCSS) }} />

      {/* Header */}
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3
            className='text-[15px] font-semibold'
            style={{ color: 'var(--color-foreground)' }}
          >
            主题编辑器
          </h3>
          <p
            className='text-xs mt-0.5'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            自定义 CSS · 支持 CSS 变量覆盖
          </p>
        </div>
        <div className='flex items-center gap-2'>
          {hasPreview && (
            <FluentBadge variant='warning' size='sm' rounded>
              预览中
            </FluentBadge>
          )}
          {hasChanges && !hasPreview && (
            <FluentBadge variant='info' size='sm' rounded>
              未保存
            </FluentBadge>
          )}
          <FluentButton
            variant='ghost'
            size='sm'
            icon={<Code2 className='w-3.5 h-3.5' />}
            onClick={() => setShowReference(!showReference)}
          >
            {showReference ? '隐藏参考' : 'CSS 参考'}
          </FluentButton>
        </div>
      </div>

      {/* Description */}
      <FluentCard
        padding='12px'
        className='flex gap-3 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/5'
      >
        <span className='w-7 h-7 rounded-lg bg-[#8b5cf6]/15 flex items-center justify-center shrink-0'>
          <Code2 className='w-3.5 h-3.5 text-[#8b5cf6]' />
        </span>
        <div className='text-xs leading-relaxed text-gray-700 dark:text-gray-300'>
          <p className='font-medium'>自定义 CSS</p>
          <p className='text-[#9ca3af] mt-0.5'>输入 CSS 覆盖站点主题，保存后全局生效；可先预览再保存。</p>
        </div>
      </FluentCard>

      {showReference && (
        <FluentCard
          padding='12px'
          className='bg-gray-900 dark:bg-black border-gray-800 dark:border-white/10'
        >
          <div className='flex items-center justify-between mb-2'>
            <span className='text-xs font-medium text-gray-300'>CSS 参考</span>
            <FluentBadge variant='default' size='sm' rounded>
              只读
            </FluentBadge>
          </div>
          <pre className='text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto'>
            {DEFAULT_CSS_REFERENCE}
          </pre>
        </FluentCard>
      )}

      {/* Editor */}
      <FluentCard padding='16px' className='space-y-3'>
        <div className='flex items-center gap-2'>
          <span className='w-7 h-7 rounded-lg bg-[#3b82f6]/15 flex items-center justify-center'>
            <Code2 className='w-3.5 h-3.5 text-[#3b82f6]' />
          </span>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>CSS 代码</h4>
          <FluentBadge variant='default' size='sm' rounded>
            {css.length} 字符
          </FluentBadge>
        </div>
        <FluentTextArea
          value={css}
          onChange={(e) => setCss(e.target.value)}
          placeholder='/* 在此输入自定义 CSS */'
          rows={14}
          className='font-mono !text-[13px] leading-relaxed'
          spellCheck={false}
        />
        <p className='text-xs text-[#9ca3af]'>
          支持 :root 变量、body 背景、.ui-surface 等；危险表达式已自动拦截。
        </p>
      </FluentCard>

      {/* Actions bar */}
      <div className='flex items-center gap-2 pt-1 sticky bottom-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur rounded-xl p-3 border border-gray-200 dark:border-white/5 shadow-sm flex-wrap'>
        <FluentButton
          variant='secondary'
          size='md'
          icon={<Eye className='w-4 h-4' />}
          onClick={handlePreview}
        >
          预览效果
        </FluentButton>
        {hasPreview && (
          <FluentButton variant='ghost' size='md' onClick={handleClearPreview}>
            取消预览
          </FluentButton>
        )}
        <div className='flex-1' />
        <FluentButton
          variant='ghost'
          size='md'
          icon={<RotateCcw className='w-4 h-4' />}
          onClick={handleReset}
        >
          重置
        </FluentButton>
        <FluentButton
          variant='primary'
          size='md'
          icon={<Save className='w-4 h-4' />}
          loading={saving}
          onClick={handleSave}
        >
          {saving ? '保存中...' : '保存'}
        </FluentButton>
      </div>
    </div>
  );
}
