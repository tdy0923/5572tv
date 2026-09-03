import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { clearConfigCache, getConfig } from '@/lib/config';
import { db } from '@/lib/db';
import { ensureUserTvboxToken } from '@/lib/tvboxToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // 强制动态渲染

// 普通用户也可以访问的 TVBox 配置接口
// 只返回 TVBox 安全配置，不返回完整的管理配置
export async function GET(request: NextRequest) {
  try {
    // 检查用户是否登录
    const authInfo = await getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取配置
    const config = await getConfig();

    // 🔑 自动发放/获取当前用户的专属 TVBox Token（无需管理员手动操作）
    const userTvboxToken = await ensureUserTvboxToken(
      authInfo.username,
      config,
      async (c) => {
        await db.saveAdminConfig(c);
        clearConfigCache();
      },
    );

    const securityConfig = config.TVBoxSecurityConfig || {
      enableAuth: false,
      token: '',
      enableIpWhitelist: false,
      allowedIPs: [],
      enableRateLimit: false,
      rateLimit: 60,
    };

    // 🔒 不向普通用户暴露全局 token（仅保留开关状态用于展示）
    const publicSecurityConfig = {
      enableAuth: securityConfig.enableAuth,
      token: '', // 隐藏全局 token
      enableIpWhitelist: securityConfig.enableIpWhitelist,
      allowedIPs: securityConfig.allowedIPs,
      enableRateLimit: securityConfig.enableRateLimit,
      rateLimit: securityConfig.rateLimit,
    };

    // 获取当前用户的源权限
    const currentUser = config.UserConfig.Users.find(
      (u) => u.username === authInfo.username,
    );

    // TVBox 源权限继承规则：优先 tvboxEnabledSources；否则继承网站端 enabledApis/tags
    let userEnabledSources = currentUser?.tvboxEnabledSources || [];
    if (currentUser && userEnabledSources.length === 0) {
      if (currentUser.enabledApis && currentUser.enabledApis.length > 0) {
        userEnabledSources = [...currentUser.enabledApis];
      } else if (
        currentUser.tags &&
        currentUser.tags.length > 0 &&
        config.UserConfig.Tags
      ) {
        const inheritedApis = new Set<string>();
        currentUser.tags.forEach((tagName) => {
          const tagConfig = config.UserConfig.Tags?.find(
            (t) => t.name === tagName,
          );
          if (tagConfig?.enabledApis) {
            tagConfig.enabledApis.forEach((apiKey) => {
              inheritedApis.add(apiKey);
            });
          }
        });
        userEnabledSources = Array.from(inheritedApis);
      }
    }

    // 获取所有可用源（用于管理界面选择）
    const allSources = (config.SourceConfig || [])
      .filter((s) => !s.disabled)
      .map((s) => ({ key: s.key, name: s.name }));

    // 只返回 TVBox 安全配置和站点名称（不返回其他敏感信息）
    return NextResponse.json({
      securityConfig: publicSecurityConfig,
      siteName: config.SiteConfig?.SiteName || '5572影视',
      // 🔑 新增：用户专属信息
      userToken: userTvboxToken || '',
      userEnabledSources: userEnabledSources,
      allSources: allSources,
    });
  } catch (error) {
    console.error('获取 TVBox 配置失败:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
