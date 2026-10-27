# Integração com o Wallpaper Engine

- **Criada em:** 2026-10-24 11:05:17
- **Status:** Implemented
- **Código:** `wallpaper/src/main.js`, `wallpaper/src/core/wallpaperBridge.js`, `wallpaper/src/core/settings.js`, `wallpaper/src/core/App.js`, `wallpaper/src/core/transitions.js`, `wallpaper/src/media/coverCache.js`, `wallpaper/src/core/EventLog.js`, `wallpaper/src/components/Debug.js`, `wallpaper/project.json`

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
- **REQ-WE-11** — O usuário DEVE poder ligar, pelo painel, um overlay de diagnóstico com os últimos dados de mídia recebidos (faixa, capa, playback) e um log com horário dos eventos desde o carregamento (eventos de mídia, pausa, visibilidade da página, resultado do carregamento da capa). Ligar depois do carregamento DEVE mostrar o histórico desde o carregamento.
- **REQ-WE-12** — Uma transição (fade ou crossfade) NÃO DEVE ficar presa esperando uma animação que não avança, por exemplo com a página escondida ou parada. Depois da duração mais uma margem, ela DEVE seguir como se a animação tivesse terminado.
- **REQ-WE-13** — QUANDO `Image.decode()` rejeitar uma capa, o sistema DEVE tentar usá-la pelo evento `load` antes de desistir.
- **REQ-WE-16** — QUANDO chegar uma capa sem imagem (o que acontece ao fechar o player), o sistema DEVE ignorá-la: a última capa real continua valendo para cores, "Keep last color", "Keep last cover" e o cache. O evento DEVE aparecer no log de diagnóstico.
- **REQ-WE-15** — QUANDO chegar uma faixa, uma capa ou uma posição da música antes de qualquer evento de playback desde o carregamento, o sistema DEVE tratar a mídia como ativa: abrir o card de música e mostrar a capa no fundo. A barra de progresso NÃO DEVE andar enquanto o estado for só presumido, porque a música pode estar pausada; ela DEVE começar a andar QUANDO duas posições seguidas mostrarem a música avançando ou chegar um evento de playback real. O primeiro evento de playback real DEVE prevalecer.
- **REQ-WE-17** — O log de diagnóstico DEVE sobreviver a um crash do WE: QUANDO o wallpaper carregar, o overlay DEVE mostrar também o log de todas as instâncias (uma por monitor) da inicialização anterior, juntas em ordem de horário. Cada linha DEVE indicar a instância que a gravou. O log DEVE registrar cada resize da janela com o tamanho.
- **REQ-WE-14** — O sistema DEVE guardar a última capa recebida junto com o título e o artista. QUANDO, depois de um carregamento, chegar uma faixa com o mesmo título e artista e nenhuma capa tiver chegado ainda, o sistema DEVE usar a capa guardada (imagem e cores). Uma capa recebida do WE DEVE sempre substituir a guardada.

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

- **Problema investigado (REQ-WE-11 a 14):** ao voltar para o wallpaper depois de usar outro, às vezes a capa não aparecia, e trocar de música nem sempre resolvia. O WE só dispara eventos de mídia quando algo muda (não está documentado se reenvia o estado atual ao recarregar), e músicas do mesmo álbum não mudam a capa. As causas possíveis no nosso lado eram: transições esperando `animation.finished` de uma animação parada; `decode()` rejeitando em silêncio; e a capa nunca ser reenviada. As três foram tratadas, e o overlay de diagnóstico permite confirmar no WE qual delas acontece.
- **Playback presumido (REQ-WE-15):** no WE, ao trocar rapidamente para outro wallpaper e voltar, as cores mudavam com a música (a capa chegava) mas o card de música não abria e a capa do fundo não aparecia. Os dois só reagiam ao evento de playback, que o WE também só manda quando muda. `App.assumePlaying()` abre o card e mostra a capa do fundo na primeira faixa, capa ou timeline que chegar sem playback conhecido, mas deixa o relógio da barra parado. `timelineAdvanced()` (em `TimelineClock.js`) confirma a reprodução quando a posição avança pelo menos metade do tempo decorrido entre dois eventos e no mínimo 0,5 s, o que ignora pequenas variações na posição informada. As duas etapas aparecem no log de diagnóstico.
- **Capa vazia (REQ-WE-16):** ao fechar o player, os cards voltavam para `#111111` mesmo com "Keep last color". A capa enviada nesse momento não tem imagem e tem cores em branco; como as duas cores eram iguais, `normalizeThumbnail` (REQ-WE-7) as trocava por `#111111`/`#ffffff`, idênticas às cores padrão do usuário. `isEmptyThumbnail()` reconhece uma imagem com menos de 100 caracteres (uma capa PNG real tem muito mais).
- **Log entre inicializações (REQ-WE-17):** investigando crashes do WE ao desligar os monitores por inatividade (o Visualizador de Eventos mostrou corrupção de heap no `wallpaper64.exe`, `0xc0000374`, e o `webwallpaper64.exe` caindo só depois). `EventLog` grava cada instância numa chave própria do `localStorage` (`minimalistcards.eventLog.<início>.<id>`), já que os monitores compartilham o armazenamento. O id tem 2 caracteres sorteados a cada carregamento: a posição da janela (`screenX/Y`) informada pelo WE não identifica o monitor (dois monitores podem informar a mesma). Instâncias que começaram com menos de 30 s de diferença contam como a mesma inicialização. Ficam as 16 sessões mais recentes. No overlay o log tem uma coluna própria à esquerda.
- **Cache da capa (REQ-WE-14):** `localStorage`, chave `minimalistcards.lastCover`, com `{ title, artist, thumbnail }`. É gravado quando chega uma capa e quando chega uma faixa depois de uma capa, então termina certo nas duas ordens de chegada. Falhas de armazenamento são ignoradas.

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
| REQ-WE-11 | Manual no WE: ligar "Show debug info" e trocar de wallpaper e voltar; o log mostra os eventos recebidos |
| REQ-WE-17 | `tests/eventLog.test.js`; manual no WE: com o debug ligado, reiniciar o WE e ver "previous start" com as linhas dos monitores |
| REQ-WE-12 | `tests/transitions.test.js` › "a transition never waits forever on a stalled animation" |
| REQ-WE-13 | Revisão de `loadImage` em `Background.js` |
| REQ-WE-14 | `tests/coverCache.test.js` |
| REQ-WE-16 | `tests/settings.test.js` › "covers without an image are recognized as empty"; manual no WE: fechar o player com "Keep last color" no relógio |
| REQ-WE-15 | `tests/timelineClock.test.js` › "timelineAdvanced …"; manual em `dev/` com o listener de playback bloqueado: o card abre, a capa do fundo aparece, a barra fica parada e começa a andar depois de duas posições; no WE, trocar rápido de wallpaper e voltar |
