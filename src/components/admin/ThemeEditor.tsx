'use client';

import { useState } from 'react';

import { buttonStyles, showError, showSuccess } from '@/app/admin/admin-utils';

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

  return (
    <div className='space-y-4'>
      <style dangerouslySetInnerHTML={{ __html: sanitizeCSS(previewCSS) }} />

      <div className='flex items-center justify-between'>
        <div>
          <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
            自定义 CSS
          </h4>
          <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
            输入自定义 CSS 代码来修改站点主题，支持 CSS 变量
          </p>
        </div>
        <button
          onClick={() => setShowReference(!showReference)}
          className='text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300'
        >
          {showReference ? '隐藏参考' : 'CSS 参考'}
        </button>
      </div>

      {showReference && (
        <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700'>
          <pre className='text-xs text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap'>
            {DEFAULT_CSS_REFERENCE}
          </pre>
        </div>
      )}

      <textarea
        value={css}
        onChange={(e) => setCss(e.target.value)}
        placeholder='/* 在此输入自定义 CSS */'
        className='w-full h-64 p-3 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y'
        spellCheck={false}
      />

      <div className='flex items-center gap-3'>
        <button
          onClick={handlePreview}
          className={`px-4 py-2 text-sm font-medium ${buttonStyles.secondary}`}
        >
          预览效果
        </button>
        {previewCSS && (
          <button
            onClick={handleClearPreview}
            className='px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          >
            取消预览
          </button>
        )}
        <div className='flex-1' />
        <button
          onClick={handleReset}
          className='px-4 py-2 text-sm font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300'
        >
          重置
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-2 text-sm font-medium ${saving ? buttonStyles.disabled : buttonStyles.primary}`}
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}
