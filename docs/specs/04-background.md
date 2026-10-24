# 04 — Fundo

- **Status:** Implemented
- **Código:** `src/components/Background.js`, `src/styles/components/background.css`

## Contexto

O fundo é a capa do álbum, ampliada, girando devagar, pulsando com o grave, borrada e tingida pela cor primária. Por cima pode haver uma imagem do usuário.

A v1 tinha dois problemas:

- **Custo na GPU.** O fundo combinava várias coisas recompostas a cada frame:
  - um `backdrop-filter: blur(100px)` em tela cheia;
  - sobre uma imagem de cerca de 115vmax girando;
  - com `scale` mudando a cada áudio;
  - mais um `mix-blend-mode`.

  O blur de 100px da tela inteira era recalculado o tempo todo. É o maior custo de GPU do wallpaper e soma risco de reset do driver quando há um jogo rodando.
- **`movementSpeed` sem efeito.** O setter mudava o elemento que não tinha a animação.

## Requisitos

- **REQ-BG-1** — O blur DEVE ser calculado uma vez por capa (e no resize da janela), nunca por frame.
- **REQ-BG-2** — O resultado DEVE ser visualmente equivalente ao da v1:
  - blur de 100px na escala da tela;
  - capa girando;
  - tinta `primaryColor` com 80% de alpha em `multiply`;
  - fundo preto.
- **REQ-BG-3** — As bordas do blur NÃO DEVEM escurecer nem ficar transparentes. Os cantos da tela tocam a borda da imagem durante a rotação.
- **REQ-BG-8** — A capa girando DEVE cobrir a tela inteira em qualquer ângulo e em qualquer proporção de tela (16:9, 16:10, 4:3, 1:1, ultrawide). Isso inclui o redimensionamento da janela.
- **REQ-BG-4** — `Movement Speed` DEVE controlar a rotação: 0 para no ângulo atual, e 1–240 dá uma volta a cada `241 − valor` segundos. Mudar o valor NÃO DEVE fazer a rotação saltar.
- **REQ-BG-5** — Com o grave, a capa e a imagem custom DEVEM escalar `1 + grave × sensibilidade`.
- **REQ-BG-6** — Troca de capa e de imagem custom DEVEM ter crossfade. Trocas rápidas DEVEM aplicar apenas a última.
- **REQ-BG-7** — A imagem custom DEVE aceitar caminho vazio (sem imagem) e opacidade de 0 a 1.

## Design

- **Tamanho (REQ-BG-8):** um quadrado girando cobre a tela em qualquer ângulo só se o lado for pelo menos igual à diagonal da tela. `updateSize()` define `--background-size = ceil(hypot(innerWidth, innerHeight)) + 2px` na carga e no `resize`. A v1 usava um valor fixo de `max(114.8vw, 114.8vh)`, que só cobre telas a partir de 16:9. Em 16:10 (precisa de 1.179), 4:3 (1.250) ou 1:1 (1.414), as bordas apareciam durante a rotação. A função CSS `hypot()` não é usada porque só existe no Chromium 120+.
- **Blur:** a capa é decodificada (`Image.decode()`) e desenhada num `<canvas>` de 256×256 com `ctx.filter = blur(σ)`, onde `σ = 100 × 256 / lado`. O canvas é exibido no tamanho do lado. Como já está borrado, a ampliação bilinear não aparece.
- **Bordas (REQ-BG-3):** antes do blur, a imagem é cercada por 8 cópias espelhadas num canvas auxiliar (margem de 3σ). Isso equivale ao modo de borda espelhado do `backdrop-filter`.
- **Rotação (REQ-BG-4):** uma animação WAAPI infinita de 1 s por volta, com velocidade ajustada por `updatePlaybackRate(1 / (241 − valor))`. Mudar o playback rate preserva o ângulo atual, diferente de mudar `animation-duration`.
- **Beat:** a propriedade CSS `scale` no canvas e na imagem custom. É só composição, sem layout.
- A tinta é um `div` com `mix-blend-mode: multiply` e transição de cor de 1 s, sem `backdrop-filter`.
- Um token de carregamento descarta capas que terminam de decodificar depois de uma capa mais nova.

### Mudança de comportamento intencional

Com `Movement Speed = 0`, a v1 deixava a imagem a 0°, e qualquer valor ficava sem efeito por causa do bug. Agora 0 congela no ângulo atual.

## Critérios de aceitação

| Requisito | Verificação |
|---|---|
| REQ-BG-1 | Revisão: `drawBlurred` só é chamado em `setThumbnail` e no `resize` |
| REQ-BG-2, 3 | Manual: comparar com a v1 no WE. Os cantos não escurecem durante a rotação |
| REQ-BG-8 | Smoke: com janelas 1:1, 4:3 e 16:10 e a rotação fixada em 45°, nenhum canto mostra o fundo preto |
| REQ-BG-4 | Manual: mover o slider com o wallpaper aberto. A rotação muda de velocidade sem saltar |
| REQ-BG-5, 6, 7 | Manual em `dev/` (tecla `N` troca de faixa rapidamente) |
