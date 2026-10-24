# Integração com o Wallpaper Engine

- **Criada em:** 2026-10-24 11:05:17
- **Status:** Implemented
- **Código:** `src/main.js`, `src/core/wallpaperBridge.js`, `src/core/settings.js`, `project.json`

## Contexto

O WE expõe uma API global:

- `wallpaperRegister*Listener` para áudio, status de mídia, propriedades da faixa, thumbnail, playback e timeline;
- `window.wallpaperPropertyListener` com `applyUserProperties` (propriedades do usuário) e `setPaused`.

Na v1 o registro acontecia 1 s depois do `DOMContentLoaded`. Para não perder as propriedades enviadas no início, os valores eram copiados para o `localStorage` e restaurados depois. Isso tinha três defeitos:

- valores velhos sobreviviam a propriedades renomeadas ou removidas;
- o handler podia ser chamado antes de o `propertiesMap` existir;
- havia 15 cópias do parse `"true" || true`.

## Requisitos

- **REQ-WE-1** — O sistema DEVE registrar todos os listeners de forma síncrona, durante o carregamento do módulo, sem espera fixa.
- **REQ-WE-2** — O sistema NÃO DEVE persistir propriedades por conta própria. O WE reenvia todas ao carregar.
- **REQ-WE-3** — QUANDO uma propriedade chegar, o sistema DEVE convertê-la para o tipo certo (bool, número com limites, texto), aceitando também a forma em string.
- **REQ-WE-4** — QUANDO uma propriedade for desconhecida ou inválida, o sistema DEVE ignorá-la ou usar o default, sem lançar erro.
- **REQ-WE-5** — As chaves e os defaults DEVEM bater com o `project.json`, inclusive o erro de digitação legado `trackcardartits*`, para não perder configurações salvas dos usuários.
- **REQ-WE-6** — QUANDO o título vier vazio, o sistema DEVE mostrar "Untitled".
- **REQ-WE-7** — QUANDO `primaryColor` for igual a `textColor`, o sistema DEVE usar `#111111` e `#ffffff`.
- **REQ-WE-8** — QUANDO o WE chamar `setPaused(true)`, o sistema DEVE parar o render loop. Com `false`, DEVE retomar.
- **REQ-WE-9** — QUANDO a integração de mídia for desativada (`MediaStatus.enabled = false`), o card de música DEVE fechar.
- **REQ-WE-10** — Fora do WE, por exemplo no navegador, a ausência da API NÃO DEVE quebrar a página.

## Design

- **`connectWallpaperEngine(handlers)`** registra cada listener se a função existir, ou registra um `console.warn` (REQ-WE-10). Também normaliza os eventos:
  - `normalizeTrack`: REQ-WE-6;
  - `normalizeThumbnail`: REQ-WE-7;
  - `normalizeTimeline`: converte para número;
  - `toPlaybackState`: converte o estado em `"playing" | "paused" | "stopped"`.
- **`SETTINGS`** é um objeto `{ chave: { fallback, min, max, parse, apply } }`. Ele é a única fonte de defaults em JS:
  - `applyDefaults(ui)` roda no construtor do `App`, então a UI nasce igual ao default do `project.json` antes mesmo de o WE responder;
  - `applySettings(ui, properties)` aplica o que o WE enviar.
- Propriedades que só existem na interface do WE (`schemecolor`, `information`) e os grupos são ignorados.
- Os ajustes internos que não aparecem no `project.json` (`peakHoldFrames`, `peakFallSpeed`) ficam em `config.js`.

### Mudança de comportamento intencional

O tamanho do peak dot agora respeita o slider (1–10). A v1 limitava internamente a 2–12, então o valor 1 do slider virava 2.

## Critérios de aceitação

| Requisito | Verificação |
|---|---|
| REQ-WE-1 | Revisão de `main.js` |
| REQ-WE-3, 4 | `tests/parse.test.js`; `tests/settings.test.js` › "applySettings parses values and ignores unknown keys" |
| REQ-WE-5 | `tests/settings.test.js` › "every project.json property is handled", "every setting exists in project.json…" |
| REQ-WE-6 | `tests/settings.test.js` › "tracks without a title are called Untitled" |
| REQ-WE-7 | `tests/settings.test.js` › "thumbnails with identical colors get readable fallbacks" |
| REQ-WE-8, 9 | Manual: em `dev/`, teclas `P` e `M` |
| REQ-WE-10 | Manual: abrir `index.html` servido sem o mock. A página carrega com avisos no console |
