import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  Input,
  Output,
  EventEmitter,
  PLATFORM_ID,
  inject,
  NgZone,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';

// Monaco type declarations
declare const monaco: any;

/** Language mapping for Monaco editor */
const LANGUAGE_MAP: Record<string, string> = {
  php: 'php',
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  python: 'python',
  py: 'python',
  sql: 'sql',
  java: 'java',
  csharp: 'csharp',
  'c#': 'csharp',
  cpp: 'cpp',
  'c++': 'cpp',
  c: 'c',
  go: 'go',
  rust: 'rust',
  ruby: 'ruby',
  shell: 'shell',
  bash: 'shell',
  sh: 'shell',
  html: 'html',
  css: 'css',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  markdown: 'markdown',
  md: 'markdown',
  dockerfile: 'dockerfile',
  powershell: 'powershell',
  lua: 'lua',
  perl: 'perl',
  swift: 'swift',
  kotlin: 'kotlin',
  scala: 'scala',
  r: 'r',
};

@Component({
  selector: 'app-monaco-editor',
  template: `<div #editorContainer class="editor-container"></div>`,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .editor-container {
      width: 100%;
      height: 400px;
      border-radius: 0 0 var(--radius) var(--radius);
      overflow: hidden;
    }
  `],
})
export class MonacoEditorComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef<HTMLDivElement>;

  @Input() code = '';
  @Input() language = 'plaintext';
  @Input() readOnly = true;

  @Output() codeChange = new EventEmitter<string>();

  private editor: any = null;
  private themeInterval: ReturnType<typeof setInterval> | null = null;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly themeService = inject(ThemeService);
  private readonly zone = inject(NgZone);
  private monacoLoaded = false;

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadMonaco();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.editor) return;

    if (changes['code'] && !changes['code'].firstChange) {
      const currentValue = this.editor.getValue();
      if (currentValue !== this.code) {
        this.editor.setValue(this.code || '');
      }
    }
    if (changes['language'] && !changes['language'].firstChange) {
      const model = this.editor.getModel();
      if (model) {
        (window as any).monaco?.editor.setModelLanguage(model, this.resolveLanguage(this.language));
      }
    }
    if (changes['readOnly'] && !changes['readOnly'].firstChange) {
      this.editor.updateOptions({ readOnly: this.readOnly });
    }
  }

  ngOnDestroy(): void {
    if (this.themeInterval) {
      clearInterval(this.themeInterval);
    }
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
  }

  private loadMonaco(): void {
    if ((window as any).monaco) {
      this.monacoLoaded = true;
      this.initEditor();
      return;
    }

    const onGotAmdLoader = () => {
      const requireConfig = { paths: { vs: 'assets/monaco/vs' } };
      (window as any).require.config(requireConfig);
      (window as any).require(['vs/editor/editor.main'], () => {
        this.monacoLoaded = true;
        this.initEditor();
      });
    };

    // Check if AMD loader already exists
    if ((window as any).require) {
      onGotAmdLoader();
      return;
    }

    const loaderScript = document.createElement('script');
    loaderScript.type = 'text/javascript';
    loaderScript.src = 'assets/monaco/vs/loader.js';
    loaderScript.addEventListener('load', onGotAmdLoader);
    document.body.appendChild(loaderScript);
  }

  private initEditor(): void {
    const monacoNs = (window as any).monaco;
    if (!monacoNs) return;

    // Define custom themes
    monacoNs.editor.defineTheme('dsv-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#101012',
        'editor.foreground': '#F4F4F5',
        'editorLineNumber.foreground': '#52525B',
        'editorLineNumber.activeForeground': '#A1A1AA',
        'editor.lineHighlightBackground': '#18181B',
        'editor.selectionBackground': '#22C55E33',
        'editorCursor.foreground': '#22C55E',
      },
    });

    monacoNs.editor.defineTheme('dsv-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.foreground': '#18181B',
        'editorLineNumber.foreground': '#A1A1AA',
        'editorLineNumber.activeForeground': '#52525B',
        'editor.lineHighlightBackground': '#F4F4F5',
        'editor.selectionBackground': '#2563EB33',
        'editorCursor.foreground': '#2563EB',
      },
    });

    this.zone.runOutsideAngular(() => {
      this.editor = monacoNs.editor.create(this.editorContainer.nativeElement, {
        value: this.code || '',
        language: this.resolveLanguage(this.language),
        theme: this.themeService.isDark() ? 'dsv-dark' : 'dsv-light',
        readOnly: this.readOnly,
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        fontLigatures: true,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        renderLineHighlight: 'line',
        padding: { top: 12, bottom: 12 },
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
        },
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        contextmenu: false,
        wordWrap: 'on',
      });

      this.editor.onDidChangeModelContent(() => {
        this.zone.run(() => {
          this.codeChange.emit(this.editor.getValue());
        });
      });
    });

    // Watch theme changes
    // We use a simple interval check since ThemeService uses signals
    this.watchTheme();
  }

  private watchTheme(): void {
    // Use effect-like approach by checking the signal periodically
    // is acceptable for a non-signal-aware component
    let lastDark = this.themeService.isDark();
    const interval = setInterval(() => {
      const currentDark = this.themeService.isDark();
      if (currentDark !== lastDark) {
        lastDark = currentDark;
        if (this.editor) {
          (window as any).monaco?.editor.setTheme(currentDark ? 'dsv-dark' : 'dsv-light');
        }
      }
    }, 500);

    this.themeInterval = interval;
  }

  private resolveLanguage(lang: string): string {
    const normalized = (lang || '').toLowerCase().trim();
    return LANGUAGE_MAP[normalized] || normalized || 'plaintext';
  }
}
