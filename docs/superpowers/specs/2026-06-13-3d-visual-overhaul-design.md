# DOTA FOREVER 2.0 — Three.js 真 3D 视觉大版本 设计规格

> 状态:已获用户批准(2026-06-13)。1.0(Canvas2D)已发布为 v1.0.0 tag。
> 本版本目标:全部单位告别 2D 圆圈/符号造型,升级为真 3D 低多边形模型 + 程序化动作。

## 1. 目标与边界

**目标**
- 全部单位(112 英雄、兵线小兵、野怪、Boss、建筑)拥有 3D 模型与动作(待机/走路/攻击/施法/引导/死亡/受击/眩晕)。
- 真 3D 场景:透视俯视镜头、实时光照与单位投影阴影、昼夜光照过渡、3D 地形(高台/坡道/河道/树)。
- 技能/物品特效迁移为 3D 粒子/几何特效。

**硬约束**
- **sim / ui / audio 零改动**:渲染器只读 `World` 状态与每 tick 事件流。模拟仍是 30Hz 确定性;渲染 60fps 插值。
- **全原创程序化内容**(IP 边界):无任何外部模型/贴图素材;全部几何程序生成;不使用暴雪/Valve 素材。
- **112 英雄不逐个建模**:模型由数据(UnitArt 描述符 + heroDef)参数化生成。
- 新依赖仅 `three`(MIT)。其余零运行时依赖不变。

**非目标(本版本不做)**
- 不改任何游戏机制/数值;不做联机;不做可旋转镜头(经典固定视角);不做骨骼蒙皮(SkinnedMesh)——部件刚体层级变换足够表达低多边形动作;不引入美术资产管线。

## 2. 总体架构(并存式迁移)

```
src/render3d/            新 3D 渲染器(Three.js)
  scene.ts               场景/相机/灯光/阴影/昼夜
  modelGen.ts            参数化单位模型生成(描述符 → THREE.Group)
  animator.ts            程序化姿态系统(sim 字段 → 部件变换)
  terrain3d.ts           地形网格烘焙(高度图/河道/树/悬崖)
  fx3d.ts                事件流 → 3D 特效(粒子/光柱/冲击环/弹道)
  renderer3d.ts          主渲染器:同步 world↔scene、插值、迷雾、选取
```

- **切换**:URL `?renderer=3d` 启用(默认仍 2D);main.ts 按参数实例化 2D 或 3D 渲染器,二者实现同一窄接口(resize/render(world, alpha)/worldToScreen/screenToWorld/centerOn)。鼠标拾取:3D 用 raycast 到地面平面换算世界坐标,喂给现有 input 层(接口不变)。
- **追平后切默认**,2D 保留为回退(`?renderer=2d`)。
- DOM HUD / 商店 / 记分板 / 结算 / killfeed 全部不动。小地图保持 2D canvas。

## 3. 场景与镜头(scene.ts)

- `PerspectiveCamera` fov≈40,俯角 ≈55°(经典 WC3/DotA 视感),yaw 固定;缩放=沿视线推拉(限位),平移=沿地面 XZ。复用现有 camera.ts 的输入语义(edge-pan/键盘/空格回英雄),由适配层把 2D camera pos/zoom 映射为 3D 相机位姿。
- 灯光:`DirectionalLight`(投影阴影,shadow map 2048)+ `AmbientLight`。**昼夜**:读 `world.isNight` 与时间,插值光色(白昼暖白→夜晚蓝暗)与强度;泉水/塔核心点光仅装饰(少量,控性能)。
- 坐标:世界单位 1:1 映射到 three 单位(x→x,y→z,高度→y)。地形两级高台 y = 0 / 60 / 120(视觉高度,可调常量)。

## 4. 参数化单位模型(modelGen.ts)

**输入**:现有 `unitArt(ArtInput) → UnitArt` 描述符(BodyShape / WeaponKind / UnitVisualRole / color / scale 已存在,1.0 已用于 2D)。3D 在其上消费,不重复造描述符。

**人形组件(英雄/人形野怪/兵)** —— low-poly 刚体部件 Group 层级:
```
root(朝向 yaw)
 ├ hips
 │   ├ torso(胶囊/盒,体型参数化)── head(球/盒+头饰)
 │   │   ├ armL(上臂+前臂两段圆柱)── handL(持盾/副手)
 │   │   └ armR(同)── handR(持武器网格)
 │   └ legL / legR(大腿+小腿两段)
 └ 附件:披风(盒片)/肩甲/底座选取环
```
- **体型参数化**:str→宽躯干粗四肢;agi→窄长;int→法袍(躯干裙摆锥台)+ 杖。由 heroDef.primary 与 role 推导。
- **武器网格**:sword(拉长盒+护手)/staff(杆+顶端球发光)/bow(弧+弦)/claw(三角片组)/hammer(柄+头盒)/spear(长杆+尖锥)。
- **个性化**:`heroDef.color` 主色 + 自动衍生深浅(复用 lighten/darken 逻辑思路);胸前纹章=小色块片;同队描边→改为底座选取环色(蓝/红)。
- **非人形**:野怪兽形(四足:躯干水平+四短腿+头+背刺)、攻城车(车体+轮×4+炮管)、Boss(放大人形+角+体积感附件)。
- **建筑**:塔(锥台塔身+城垛圈+发光核心球,分级高度/亮度)、兵营(双坡顶盒)、主基地(六边形棱柱多层+护盾半透球壳,无敌时显示)、泉水(圆池+上升粒子)。
- **几何缓存**:同 (shape,weapon,role,体型档) 共享 BufferGeometry;材质按颜色缓存(`MeshLambertMaterial`,flat 风格);每单位仅克隆 Group 结构共享几何。100+ 单位 draw call 预算 <300。

## 5. 程序化动作(animator.ts)

无关键帧资产;每帧由 sim 字段计算各部件局部旋转/位移(纯函数,可单测):

| 动作 | 触发(sim 字段) | 姿态 |
|---|---|---|
| idle | 默认 | 躯干呼吸起伏 sin(t),武器微晃 |
| walk | `prevPos≠pos`(实际位移) | 腿对摆 ±35°,臂反相摆,躯干小幅纵移;相位速度∝移速 |
| attack | `windupUntil>now`(前摇)→后摆;命中事件→挥砍 | 持武臂举起→快速下劈弧;弓=拉弦前推 |
| cast | `casting` 非空 | 双臂上举,杖头/手部发光球放大 |
| channel | `channeling` 非空 | 双臂前伸,周期脉动 |
| death | `!alive` | 整体绕脚倒地(0.4s)→下沉+淡出(2s) |
| 受击 | `lastDamagedAt` 近 0.15s | 材质 emissive 闪白 |
| 眩晕 | `states.stunned` | 头顶转星(小星网格环绕),躯干微晃 |
| 隐身 | `states.invisible` | 整体半透(己方可见),敌视角由可见性裁剪 |

- 渲染插值:`pos = lerp(prevPos, pos, alpha)`(sim 已存 prevPos);朝向 yaw 由 facing 插值。

## 6. 地形(terrain3d.ts)

- 从 `GameMap` 高度/可走数据烘焙:地面 PlaneGeometry 分块 + 顶点抬升(两级高台),悬崖侧面深色;坡道斜面。
- 河道:水面平面(半透蓝 + uv 滚动微波);树:锥+球簇 low-poly,按现有树簇数据摆放,不可走区域一致;地标(符文点环、商店环、Boss 巢穴)沿用 2D 语义放 3D 贴地标记。
- 静态合并(`BufferGeometryUtils.mergeGeometries`)控 draw call。

## 7. 特效与迷雾(fx3d.ts / renderer3d.ts)

- 复用现有事件流与 **fxStyle 颜色/类型推断**:`pos2`→光束(发光圆柱/折线),`radius+duration`→持续力场(半透圆盘+边环),`radius`→扩张环,点状→粒子爆发/上升/下沉;弹道=发光球+拖尾。浮动伤害数字/金币文字保留 DOM/2D 叠加层(贴屏坐标投影)。
- 迷雾:贴地黑色半透遮罩网格按可见格更新(纹理 alpha 写入),已探索灰雾同语义;敌方单位可见性裁剪沿用现有 isVisibleTo。

## 8. 性能预算与回退

- 目标 60fps @ ~120 单位(M 系 Mac/普通独显);手段:几何/材质缓存、静态地形合并、阴影仅单位投射、粒子池化、视锥剔除(three 自带)。
- 任何阶段 3D 不达标,`?renderer=2d` 始终可用。

## 9. 测试策略

- **单测(vitest,无 WebGL)**:modelGen 部件参数纯函数(输入描述符→部件尺寸/颜色表)、animator 姿态纯函数(t/字段→角度)、112 英雄模型参数唯一性(类似 heroArtUnique);three 对象构建用 jsdom-safe 工厂隔离(纯数据层测试,不实例化 WebGLRenderer)。
- **冒烟(Playwright)**:`?renderer=3d` 启动零控制台错误、截图存档;整局 spectate 跑通。
- 现有 722 测试不受影响(sim 未动)。

## 10. 里程碑

- **V1 可见原型**:scene + 地形平面(平色)+ 英雄人形模型 + walk/idle 动作 + 镜头/拾取适配 → 给用户真实预览。
- **V2 动作全集**:attack/cast/channel/death/受击/眩晕/隐身 + 插值打磨。
- **V3 全单位**:兵/野怪/Boss/建筑模型 + 选取环/血条(贴屏)。
- **V4 世界完整**:地形高台/河道/树/地标、特效迁移、迷雾、昼夜光照。
- **V5 收尾**:性能(实例化/合并)、112 英雄个性化打磨、切默认 3D、文档与发布(2.0.0)。

每个里程碑:tsc + 单测 + Playwright 冒烟截图 + 提交推送;V1 起每步均可在浏览器真实查看。
