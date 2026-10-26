# Render loop e áudio

- **Criada em:** 2026-10-24 11:05:17
- **Status:** Implemented
- **Código:** `src/core/RenderLoop.js`, `src/core/App.js` (`frame`, `onAudio`), `src/audio/AudioAnalyzer.js`

## Contexto

O WE chama o listener de áudio cerca de 30 vezes por segundo com 128 valores (64 do canal esquerdo seguidos de 64 do direito). Na v1, cada chamada:

- agendava um `requestAnimationFrame`;
- recalculava o mono 3 vezes (barras, fundo, beats);
- alocava arrays novos.

Com a página oculta, os rAFs se acumulavam (ver [Arquitetura](20261024-110516-architecture.md)).

## Requisitos

- **REQ-LOOP-1** — QUANDO chegar um áudio, o sistema DEVE apenas guardar a referência e incrementar uma versão.
- **REQ-LOOP-2** — O processamento do áudio DEVE rodar no máximo uma vez por áudio recebido e no máximo uma vez por frame. A suavização e o tempo dos peak dots ficam assim atrelados à taxa do áudio, como na v1, e não ao refresh do monitor.
- **REQ-LOOP-3** — O mono e as bandas DEVEM ser calculados uma única vez por áudio e compartilhados por todos os consumidores.
- **REQ-LOOP-4** — Um erro numa tarefa do loop NÃO DEVE interromper as outras nem inundar o console a cada frame.
- **REQ-LOOP-5** — As bandas DEVEM ser: grave = média do mono[0..20), médio = [20..40), agudo = [40..64).
- **REQ-LOOP-6** — `channels(n)` DEVE dividir o mono em `n` grupos e devolver o pico de cada um, sem `NaN` para nenhum `n` entre 9 e 64.
- **REQ-LOOP-7** — QUANDO "Auto volume" estiver ligado, o mono DEVE ser amplificado para que o pico recente da música chegue a 1, em qualquer volume: o pico de referência é o maior valor dos últimos ~3 s, então qualquer queda de volume é compensada em até ~3 s; o ganho sobe suavemente (~1 s) e cai na hora quando a música fica mais alta; ele nunca passa de 100× nem fica abaixo de 1×; abaixo do piso de silêncio (0,0005), nada é amplificado. Todos os consumidores (barras, blocos, pulsos, triângulos) usam o mono amplificado. O padrão é ligado.

## Design

- **`RenderLoop`** é um único rAF com uma lista de tarefas `(now, dt)`. Cada tarefa roda num `try/catch`, e cada mensagem de erro é logada só uma vez. `start()`/`stop()` são usados pelo `setPaused`.
- **`App.frame`:**
  1. **Segundo de parede mudou?** Chama `clockCard.tick()` e `dateCard.tick()`.
  2. **Timeline:** `trackCard.updateTimeline(now, dt)`, a cada frame.
  3. **Áudio novo** (`audioVersion` mudou): `analyzer.update` → `background.setBeat` → `trackCard.setBeats` → `audioBars.render` (só com as barras visíveis) → `debug.audio`.
- **`AudioAnalyzer`** usa buffers `Float32Array` pré-alocados e não aloca nada por frame.
- **Auto volume (REQ-LOOP-7):** a primeira versão usava ganho máximo de 8×, piso de 0,005 e meia-vida de cerca de 3 s. Com o volume do player bem baixo, o pico caía abaixo do piso e o ganho voltava a 1×, então as barras voltavam a ficar pequenas. E, como o pico caía em ritmo exponencial, quedas grandes de volume demoravam muitos segundos para ser compensadas. Daí a janela deslizante. `AudioAnalyzer.normalize()` roda logo depois do mono, antes das bandas. o maior valor de cada frame vai para um buffer circular de `windowFrames` posições; `peak` é o maior valor do buffer; o ganho-alvo é `clamp(1 / peak, 1, maxGain)` (1 abaixo do piso); o ganho vai ao alvo na hora quando o alvo é menor, e se aproxima dele em `gainSmoothing` por frame quando é maior. As constantes ficam em `AUTO_VOLUME` no `config.js`.

## Critérios de aceitação

| Requisito | Verificação |
|---|---|
| REQ-LOOP-1, 2 | Revisão de `App.onAudio` e `App.frame` |
| REQ-LOOP-3, 5 | `tests/audioAnalyzer.test.js` › "computes bass, mid and treble means" |
| REQ-LOOP-4 | Revisão de `RenderLoop.frame` |
| REQ-LOOP-6 | `tests/audioAnalyzer.test.js` › "channels keeps the peak…", "handles short arrays without NaN" |
| REQ-LOOP-7 | `tests/audioAnalyzer.test.js` › "auto volume …" |
