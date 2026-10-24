# Documentação

Este projeto segue **Spec-Driven Development (SDD)**: toda mudança de comportamento começa por uma spec em [`specs/`](specs/). A spec descreve o problema, os requisitos verificáveis e o design. O código implementa a spec, e os testes cobrem os critérios de aceitação.

## Fluxo

1. **Especificar.** Crie ou atualize a spec da área afetada, partindo do [`template.md`](specs/template.md), com `Status: Draft`.
2. **Revisar.** Cada requisito tem um ID (`REQ-AUD-3`) e é escrito no formato *"QUANDO … o sistema DEVE …"*, de modo que dê para testar.
3. **Implementar.** Faça commits pequenos no padrão [Conventional Commits](../CONTRIBUTING.md#commits). Quando ajudar, cite o ID do requisito no corpo do commit.
4. **Fechar.** Marque a spec como `Status: Implemented` e aponte, nos critérios de aceitação, o teste ou a verificação manual que cobre cada item.

Uma spec descreve o comportamento **atual**. Se o comportamento mudar, a spec muda no mesmo PR.

## Índice

| Spec | Área |
|---|---|
| [00 — Arquitetura](specs/00-architecture.md) | Visão geral, fluxo de dados, princípios |
| [01 — Integração com o Wallpaper Engine](specs/01-wallpaper-engine-integration.md) | Boot, eventos, propriedades do usuário |
| [02 — Render loop e áudio](specs/02-render-loop-and-audio.md) | Loop único, análise de áudio |
| [03 — Barras de áudio](specs/03-audio-bars.md) | WebGL2, nitidez com scale, peak dots |
| [04 — Fundo](specs/04-background.md) | Capa borrada, rotação, beat, imagem custom |
| [05 — Cards](specs/05-cards.md) | Layout, relógio, data, card de música |
| [06 — Timeline](specs/06-timeline.md) | Interpolação da posição da música |
