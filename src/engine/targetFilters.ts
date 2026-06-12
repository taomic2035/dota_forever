/**
 * 目标过滤规则已上移为 sim 域单一真相源(sim/targeting.ts):
 * sim 的施法执行做权威校验,engine/ui 复用同一套规则。
 * 本文件保留为兼容出口,engine/ui 仍可从此导入。
 */
export * from '../sim/targeting';
