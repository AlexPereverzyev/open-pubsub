import KoaRouter from 'koa-router';

export function healthchek(ctx: KoaRouter.RouterContext<IAppState, IAppContext>): void {
  ctx.body = { status: 'OK' };
}

export async function endpoint(ctx: KoaRouter.RouterContext<IAppState, IAppContext>): Promise<void> {
  const instance = await ctx.cache.fetchAvailable();
  if (instance) {
    ctx.body = { endpoint: instance.endpoint ?? null };
  } else {
    ctx.status = 503;
  }
}
