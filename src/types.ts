/**
 * WebOS · 共享类型定义
 *
 * 运行时门面 OS 由 core.ts 创建，其余模块通过 import 复用同一个实例。
 * 为了让逐步迁移的业务代码保持可编译，容器类型保留了索引签名。
 */

export type Theme = 'dark' | 'light' | 'auto';
export type WallpaperId = 'sonoma' | 'ventura' | 'monterey' | 'sunset';

export interface WallpaperDef {
  name: string;
  colors: string[];
}

export interface Note {
  id: string;
  title: string;
  body: string;
  updated: number;
}

export interface OSState {
  theme: Theme;
  wallpaper: WallpaperId | string;
  accent: string;
  dockSize: number;
  dockMagnify: boolean;
  dockAutohide: boolean;
  reduceMotion: boolean;
  notes: Note[] | null;
  volume: number;
  [key: string]: any;
}

export interface AppDef {
  id: string;
  name: string;
  en?: string;
  icon: string;
  w?: number;
  h?: number;
  dock?: boolean;
  overlay?: boolean;
  menu?: string[];
  resizable?: boolean;
  hidden?: boolean;
  [key: string]: any;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface OpenOpts {
  path?: string[];
  title?: string;
  content?: string;
  node?: FsNode;
  photo?: number;
  newInstance?: boolean;
  left?: number;
  top?: number;
  [key: string]: any;
}

export interface AppView {
  render(win: Win, opts: OpenOpts): string;
  mount?(win: Win, opts: OpenOpts): void;
}

/** 一个已打开的窗口；各应用会在实例上挂自己的私有状态（win._f / win._n …） */
export interface Win {
  id: string;
  appId: string;
  def: AppDef;
  state: { minimized: boolean; maximized: boolean; rect: Rect | null };
  opts: OpenOpts;
  z: number;
  el: HTMLElement;
  body: any;
  titleEl: any;
  toolsEl: any;
  setTitle(title: string): void;
  setTools(html: string): HTMLElement;
  rerender(opts?: OpenOpts): void;
  [key: string]: any;
}

export interface WindowManager {
  windows: Win[];
  z: number;
  missionMode: boolean;
  list(): Win[];
  visible(): Win[];
  active(): Win | null;
  byId(id: string): Win | undefined;
  byApp(appId: string): Win | undefined;
  open(appId: string, opts?: OpenOpts): Win;
  renderContent(win: Win): void;
  close(win: Win | null): void;
  focus(win: Win | null, silent?: boolean): void;
  minimize(win: Win | null): void;
  restore(win: Win | null): void;
  toggleMax(win: Win | null, skipAnim?: boolean): void;
  mission(on?: boolean): void;
  bindWindow(win: Win): void;
  [key: string]: any;
}

export interface FsNode {
  name: string;
  type: string;
  icon?: string;
  size?: string;
  modified?: string;
  children?: FsNode[];
  content?: string;
  app?: string;
  photo?: number;
  path?: string;
  [key: string]: any;
}

export interface FileSystem {
  root: FsNode;
  get(path: string | string[]): FsNode | null;
  label(path?: string[]): string;
  home: string[];
  desktopPath: string[];
  documentsPath: string[];
  picturesPath: string[];
  downloadsPath: string[];
  applicationsPath: string[];
  welcomeText: string;
}

export interface MenuItem {
  label?: string;
  title?: string;
  sep?: boolean;
  disabled?: boolean;
  checked?: boolean;
  icon?: string;
  key?: string;
  action?: () => void;
  _i?: number;
  [key: string]: any;
}

export interface WebOS {
  /* 工具 */
  uid(prefix?: string): string;
  esc(value: unknown): string;
  clamp(value: number, min: number, max: number): number;
  pad(n: number): string;
  round(n: number, digits?: number): number;
  $(selector: string, root?: ParentNode): any;
  $$(selector: string, root?: ParentNode): any[];
  el(tag: string, className?: string, html?: string): HTMLElement;
  weekCN: string[];
  monthEN: string[];
  clockText(): string;
  dateText(): string;
  isCmd(event: any): boolean;

  /* 事件与持久化 */
  on(name: string, handler: (data?: any) => void): void;
  emit(name: string, data?: any): void;
  store: {
    get(key: string, fallback?: any): any;
    set(key: string, value: unknown): void;
  };
  state: OSState;
  save(key: string, value: unknown): void;

  /* 外观 */
  applyTheme(): void;
  applyAccent(): void;
  setTheme(theme: Theme): void;
  setWallpaper(id: WallpaperId | string): void;
  setAccent(color: string): void;
  renderWallpaper(): void;
  wallpapers: Record<string, WallpaperDef>;
  wallpaperSVG(id: string, prefix?: string): string;
  symbol(name: string, size?: number): string;
  appleLogo(size?: number, color?: string): string;
  iconNames: string[];
  icon(name: string): string;
  toast(title: string, message?: string, icon?: string): void;

  /* 应用与窗口 */
  apps: AppDef[];
  appById(id: string): AppDef | undefined;
  appName(id: string): string;
  appViews: Record<string, AppView>;
  wm: WindowManager;
  openApp(id: string, opts?: OpenOpts): void;
  openFile(node: FsNode | null, path?: string[]): void;
  showInfo(node: FsNode): void;
  photoSVG(index: number, prefix?: string): string;

  /* 文件系统 */
  fsRoot: FsNode;
  fs: FileSystem;

  /* 桌面外壳 */
  contextMenu(event: any, items: MenuItem[]): void;
  toggleSpotlight(on?: boolean): void;
  toggleLaunchpad(on?: boolean): void;
  toggleNotifications(on?: boolean): void;
  lockScreen(): void;
  shutdown(): void;
  desktopInit(): void;
  bootTime: number;

  /** 迁移期允许模块挂载新的能力，避免为每个新属性反复改接口 */
  [key: string]: any;
}

declare global {
  interface Window {
    OS: WebOS;
  }

  /**
   * 迁移期 DOM 兼容层：原实现通过 querySelector 直接读写
   * value / dataset / style / 自定义属性，这里开放动态成员访问。
   * 后续可逐步收敛为精确的 HTMLInputElement 等类型。
   */
  interface Element {
    [key: string]: any;
  }
  interface EventTarget {
    [key: string]: any;
  }
  interface Event {
    key: string;
  }
}
