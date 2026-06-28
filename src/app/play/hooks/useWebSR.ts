'use client';
import type ArtPlayer from 'artplayer';
import { useEffect, useRef, useState } from 'react';

export function useWebSR(artPlayerRef: React.RefObject<ArtPlayer | null>) {
  // WebSR超分相关状态
  const [webGPUSupported, setWebGPUSupported] = useState<boolean>(false);
  const [websrEnabled, setWebsrEnabled] = useState<boolean>(false);
  const [websrMode, setWebsrMode] = useState<'upscale' | 'restore'>('upscale');
  const [websrContentType, setWebsrContentType] = useState<'an' | 'rl' | '3d'>(
    'an',
  );
  const [websrNetworkSize, setWebsrNetworkSize] = useState<'s' | 'm' | 'l'>(
    's',
  );
  const [websrCompareEnabled, setWebsrCompareEnabled] = useState(false);
  const [websrComparePosition, setWebsrComparePosition] = useState(50);

  useEffect(() => {
    setWebsrEnabled(localStorage.getItem('websr_enabled') === 'true');
    const vMode = localStorage.getItem('websr_mode');
    if (vMode === 'restore') setWebsrMode('restore');
    const vType = localStorage.getItem('websr_content_type');
    if (vType === 'rl' || vType === '3d') setWebsrContentType(vType);
    const vSize = localStorage.getItem('websr_network_size');
    if (vSize === 'm' || vSize === 'l') setWebsrNetworkSize(vSize);
  }, []);

  const websrRef = useRef<{
    instance: any;
    gpu: GPUDevice | null;
    canvas: HTMLCanvasElement | null;
    weightsCache: Map<string, any>;
    isActive: boolean;
    renderLoopActive: boolean;
  }>({
    instance: null,
    gpu: null,
    canvas: null,
    weightsCache: new Map(),
    isActive: false,
    renderLoopActive: false,
  });

  const websrEnabledRef = useRef(websrEnabled);
  const websrModeRef = useRef(websrMode);
  const websrContentTypeRef = useRef(websrContentType);
  const websrNetworkSizeRef = useRef(websrNetworkSize);

  useEffect(() => {
    websrEnabledRef.current = websrEnabled;
    websrModeRef.current = websrMode;
    websrContentTypeRef.current = websrContentType;
    websrNetworkSizeRef.current = websrNetworkSize;
  }, [websrEnabled, websrMode, websrContentType, websrNetworkSize]);

  // WebGPU支持检测
  useEffect(() => {
    const checkWebGPUSupport = async () => {
      if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
        setWebGPUSupported(false);
        // // console.log('WebGPU不支持：浏览器不支持WebGPU API');
        return;
      }

      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (!adapter) {
          setWebGPUSupported(false);
          // // console.log('WebGPU不支持：无法获取GPU适配器');
          return;
        }

        setWebGPUSupported(true);
        // // console.log('WebGPU支持检测：✅ 支持');
      } catch {
        setWebGPUSupported(false);
      }
    };

    checkWebGPUSupport();
  }, []);

  // WebSR 辅助函数：获取网络名称
  const getWebsrNetworkName = (
    mode: 'upscale' | 'restore',
    size: 's' | 'm' | 'l',
  ): any => {
    if (mode === 'restore') {
      return `anime4k/cnn-restore-${size}`;
    }
    return `anime4k/cnn-2x-${size}`;
  };

  // WebSR 辅助函数：获取权重文件名
  const getWebsrWeightFilename = (
    mode: 'upscale' | 'restore',
    size: 's' | 'm' | 'l',
    contentType: 'an' | 'rl' | '3d',
  ): string => {
    if (mode === 'restore') {
      return `cnn-restore-${size}-an.json`;
    }
    return `cnn-2x-${size}-${contentType}.json`;
  };

  // 初始化Anime4K超分
  const initWebSR = async () => {
    if (!artPlayerRef.current?.video) return;

    try {
      const video = artPlayerRef.current.video as HTMLVideoElement;

      // 等待视频尺寸就绪
      if (!video.videoWidth || !video.videoHeight) {
        await new Promise<void>((resolve) => {
          const handler = () => {
            video.removeEventListener('loadedmetadata', handler);
            resolve();
          };
          video.addEventListener('loadedmetadata', handler);
          if (video.videoWidth && video.videoHeight) {
            video.removeEventListener('loadedmetadata', handler);
            resolve();
          }
        });
      }

      if (!video.videoWidth || !video.videoHeight) {
        throw new Error('无法获取视频尺寸');
      }

      // 初始化 GPU（复用已有的或创建新的）
      if (!websrRef.current.gpu) {
        const { default: WebSR } = await import('@websr/websr');
        const gpu = await WebSR.initWebGPU();
        if (!gpu) {
          throw new Error('WebGPU 初始化失败');
        }
        websrRef.current.gpu = gpu;
      }

      // 创建 canvas
      const canvas = document.createElement('canvas');
      const scale = websrModeRef.current === 'upscale' ? 2 : 1;
      canvas.width = Math.floor(video.videoWidth * scale);
      canvas.height = Math.floor(video.videoHeight * scale);

      // Canvas 样式
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.objectFit = 'contain';
      canvas.style.pointerEvents = 'none'; // 让点击穿透到 ArtPlayer
      canvas.style.zIndex = '1';

      // 插入 canvas
      const container = artPlayerRef.current.template.$video.parentElement;
      container.insertBefore(canvas, video);

      // 获取权重文件
      const weightFile = getWebsrWeightFilename(
        websrModeRef.current,
        websrNetworkSizeRef.current,
        websrContentTypeRef.current,
      );

      let weights = websrRef.current.weightsCache.get(weightFile);
      if (!weights) {
        const response = await fetch(`/weights/anime4k/${weightFile}`);
        if (!response.ok) {
          throw new Error(`权重文件加载失败: ${weightFile}`);
        }
        weights = await response.json();
        websrRef.current.weightsCache.set(weightFile, weights);
      }

      // 创建 WebSR 实例
      const { default: WebSR } = await import('@websr/websr');
      const networkName = getWebsrNetworkName(
        websrModeRef.current,
        websrNetworkSizeRef.current,
      );

      const websr = new WebSR({
        canvas: canvas,
        weights: weights,
        network_name: networkName,
        gpu: websrRef.current.gpu,
      });

      websrRef.current.instance = websr;
      websrRef.current.canvas = canvas;
      websrRef.current.isActive = true;
      websrRef.current.renderLoopActive = true;

      // 使用 requestVideoFrameCallback 手动渲染循环
      const renderFrame = () => {
        if (!websrRef.current.renderLoopActive || !websrRef.current.instance)
          return;
        websrRef.current.instance
          .render(video)
          .then(() => {
            if (websrRef.current.renderLoopActive) {
              video.requestVideoFrameCallback(renderFrame);
            }
          })
          .catch((err: any) => {
            console.warn('WebSR render error:', err);
            if (websrRef.current.renderLoopActive) {
              video.requestVideoFrameCallback(renderFrame);
            }
          });
      };
      video.requestVideoFrameCallback(renderFrame);

      // 隐藏原始视频
      video.style.opacity = '0';
      video.style.position = 'absolute';

      const modeText = websrModeRef.current === 'upscale' ? '2x超分' : '降噪';
      const sizeText = { s: '快速', m: '标准', l: '高质' }[
        websrNetworkSizeRef.current
      ];
      const typeText = { an: '动漫', rl: '真人', '3d': '3D' }[
        websrContentTypeRef.current
      ];

      // // console.log(`WebSR已启用: ${modeText} | ${sizeText} | ${typeText}`);
      if (artPlayerRef.current) {
        artPlayerRef.current.notice.show = `超分已启用 (${modeText}, ${sizeText}, ${typeText})`;
      }
    } catch (err) {
      console.error('初始化WebSR失败:', err);
      if (artPlayerRef.current) {
        artPlayerRef.current.notice.show =
          '超分启用失败：' + (err instanceof Error ? err.message : '未知错误');
      }

      // 清理
      if (websrRef.current.canvas && websrRef.current.canvas.parentNode) {
        websrRef.current.canvas.parentNode.removeChild(websrRef.current.canvas);
      }
      if (artPlayerRef.current?.video) {
        artPlayerRef.current.video.style.opacity = '1';
        artPlayerRef.current.video.style.position = '';
      }
      websrRef.current.canvas = null;
      websrRef.current.instance = null;
      websrRef.current.isActive = false;
    }
  };

  // 销毁WebSR
  const destroyWebSR = async () => {
    const ref = websrRef.current;
    ref.isActive = false;
    ref.renderLoopActive = false;

    try {
      if (ref.instance) {
        await ref.instance.destroy();
        ref.instance = null;
      }

      if (ref.canvas && ref.canvas.parentNode) {
        ref.canvas.parentNode.removeChild(ref.canvas);
        ref.canvas = null;
      }

      if (artPlayerRef.current?.video) {
        artPlayerRef.current.video.style.opacity = '1';
        artPlayerRef.current.video.style.position = '';
      }

      // // console.log('WebSR已清理');
    } catch (err) {
      console.warn('清理WebSR时出错:', err);
    }
  };

  // 切换WebSR状态
  const toggleWebSR = async (enabled: boolean) => {
    try {
      if (enabled) {
        await initWebSR();
      } else {
        await destroyWebSR();
      }
      setWebsrEnabled(enabled);
      localStorage.setItem('websr_enabled', String(enabled));
    } catch (err) {
      console.error('切换超分状态失败:', err);
    }
  };

  // 切换WebSR配置（模式/网络大小/内容类型变化时）
  const switchWebSRConfig = async () => {
    if (!websrRef.current.isActive) return;

    try {
      // 如果 upscale <-> restore 切换，canvas 尺寸会变，需要完全重建
      const currentScale = websrRef.current.canvas
        ? websrRef.current.canvas.width >
          (artPlayerRef.current?.video?.videoWidth || 0)
          ? 2
          : 1
        : 1;
      const newScale = websrModeRef.current === 'upscale' ? 2 : 1;

      if (currentScale !== newScale) {
        await destroyWebSR();
        await initWebSR();
        return;
      }

      // 否则热切换网络
      const networkName = getWebsrNetworkName(
        websrModeRef.current,
        websrNetworkSizeRef.current,
      );
      const weightFile = getWebsrWeightFilename(
        websrModeRef.current,
        websrNetworkSizeRef.current,
        websrContentTypeRef.current,
      );

      let weights = websrRef.current.weightsCache.get(weightFile);
      if (!weights) {
        const response = await fetch(`/weights/anime4k/${weightFile}`);
        if (!response.ok) throw new Error(`权重文件加载失败: ${weightFile}`);
        weights = await response.json();
        websrRef.current.weightsCache.set(weightFile, weights);
      }

      if (
        websrRef.current.instance &&
        websrRef.current.instance.switchNetwork
      ) {
        await websrRef.current.instance.switchNetwork(networkName, weights);

        if (artPlayerRef.current) {
          const modeText =
            websrModeRef.current === 'upscale' ? '2x超分' : '降噪';
          const sizeText = { s: '快速', m: '标准', l: '高质' }[
            websrNetworkSizeRef.current
          ];
          const typeText = { an: '动漫', rl: '真人', '3d': '3D' }[
            websrContentTypeRef.current
          ];
          artPlayerRef.current.notice.show = `已切换: ${modeText}, ${sizeText}, ${typeText}`;
        }
      }
    } catch (err) {
      console.error('切换WebSR配置失败:', err);
      // 失败时重建
      await destroyWebSR();
      await initWebSR();
    }
  };

  // WebSR 启用/禁用生命周期
  useEffect(() => {
    if (!websrEnabled || !webGPUSupported || !artPlayerRef.current?.video) {
      destroyWebSR();
      return;
    }

    const video = artPlayerRef.current.video as HTMLVideoElement;

    const waitForVideo = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        initWebSR();
      } else {
        const handler = () => {
          video.removeEventListener('loadedmetadata', handler);
          initWebSR();
        };
        video.addEventListener('loadedmetadata', handler);
      }
    };

    waitForVideo();

    return () => {
      destroyWebSR();
    };
  }, [websrEnabled, webGPUSupported]);

  // WebSR 配置变化（模式/网络大小/内容类型）
  useEffect(() => {
    if (!websrRef.current.isActive) return;
    switchWebSRConfig();
  }, [websrMode, websrNetworkSize, websrContentType]);

  // WebSR 对比模式
  useEffect(() => {
    if (!websrRef.current.canvas || !artPlayerRef.current?.video) return;

    const canvas = websrRef.current.canvas;
    const video = artPlayerRef.current.video as HTMLVideoElement;

    if (websrCompareEnabled) {
      canvas.style.clipPath = `inset(0 0 0 ${websrComparePosition}%)`;
      video.style.opacity = '1';
      video.style.clipPath = `inset(0 ${100 - websrComparePosition}% 0 0)`;
    } else {
      canvas.style.clipPath = '';
      video.style.opacity = '0';
      video.style.clipPath = '';
    }
  }, [websrCompareEnabled, websrComparePosition]);

  return {
    webGPUSupported,
    websrEnabled,
    websrMode,
    websrContentType,
    websrNetworkSize,
    websrCompareEnabled,
    websrComparePosition,
    setWebsrEnabled,
    setWebsrMode,
    setWebsrContentType,
    setWebsrNetworkSize,
    setWebsrCompareEnabled,
    setWebsrComparePosition,
    initWebSR,
    destroyWebSR,
    toggleWebSR,
    switchWebSRConfig,
  };
}
