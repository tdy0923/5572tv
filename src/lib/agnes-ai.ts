/**
 * Agnes AI API Service
 * 图片和视频生成服务
 */

const AGNES_API_BASE = 'https://apihub.agnes-ai.com/v1';
const AGNES_API_KEY = process.env.AGNES_API_KEY || '';

// 图片生成
export interface ImageGenerationRequest {
  prompt: string;
  size?: string;
  model?: string;
  returnBase64?: boolean;
}

export interface ImageGenerationResponse {
  url?: string;
  b64Json?: string;
}

// 视频生成
export interface VideoGenerationRequest {
  prompt: string;
  imageUrl?: string;
  width?: number;
  height?: number;
  numFrames?: number;
  frameRate?: number;
}

export interface VideoGenerationResponse {
  taskId: string;
  videoId: string;
  status: string;
}

/**
 * 生成图片
 */
export async function generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
  const response = await fetch(`${AGNES_API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AGNES_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: request.model || 'agnes-image-2.1-flash',
      prompt: request.prompt,
      size: request.size || '1024x768',
      return_base64: request.returnBase64 || false,
      extra_body: {
        response_format: 'url',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Image generation failed: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    url: data.data?.[0]?.url,
    b64Json: data.data?.[0]?.b64_json,
  };
}

/**
 * 创建视频生成任务
 */
export async function createVideoTask(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  const body: any = {
    model: 'agnes-video-v2.0',
    prompt: request.prompt,
    width: request.width || 1152,
    height: request.height || 768,
    num_frames: request.numFrames || 121,
    frame_rate: request.frameRate || 24,
  };

  if (request.imageUrl) {
    body.image = request.imageUrl;
  }

  const response = await fetch(`${AGNES_API_BASE}/videos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AGNES_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Video task creation failed: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    taskId: data.task_id,
    videoId: data.video_id,
    status: data.status,
  };
}

/**
 * 获取视频生成结果
 */
export async function getVideoResult(videoId: string): Promise<any> {
  const response = await fetch(
    `https://apihub.agnes-ai.com/agnesapi?video_id=${videoId}`,
    {
      headers: {
        'Authorization': `Bearer ${AGNES_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get video result: ${response.statusText}`);
  }

  return response.json();
}
