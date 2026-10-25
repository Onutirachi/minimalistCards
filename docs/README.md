# Documentação

Este projeto segue **Spec-Driven Development (SDD)**: toda mudança de comportamento começa por uma spec em [`specs/`](specs/). A spec descreve o problema, os requisitos verificáveis e o design. O código implementa a spec, e os testes cobrem os critérios de aceitação.

## Fluxo

1. **Especificar.** Crie ou atualize a spec da área afetada, partindo do [`template.md`](specs/template.md), com `Status: Draft`. Uma spec nova se chama `AAAAMMDD-HHMMSS-slug.md`, com a data e a hora de criação, por exemplo `20261024-110521-timeline.md`. Assim a pasta fica em ordem cronológica, e o nome não muda quando a spec é atualizada.
2. **Revisar.** Cada requisito tem um ID (`REQ-AUD-3`) e é escrito no formato *"QUANDO … o sistema DEVE …"*, de modo que dê para testar.
3. **Implementar.** Faça commits pequenos no padrão [Conventional Commits](../CONTRIBUTING.md#commits). Quando ajudar, cite o ID do requisito no corpo do commit.
4. **Fechar.** Marque a spec como `Status: Implemented` e aponte, nos critérios de aceitação, o teste ou a verificação manual que cobre cada item.

Uma spec descreve o comportamento **atual**. Se o comportamento mudar, a spec muda no mesmo PR.

## Índice

| Spec | Área |
|---|---|
| [Arquitetura](specs/20261024-110516-architecture.md) | Visão geral, fluxo de dados, princípios |
| [Integração com o Wallpaper Engine](specs/20261024-110517-wallpaper-engine-integration.md) | Boot, eventos, propriedades do usuário |
| [Render loop e áudio](specs/20261024-110517-render-loop-and-audio.md) | Loop único, análise de áudio |
| [Barras de áudio](specs/20261024-110518-audio-bars.md) | WebGL2, nitidez com scale, peak dots |
| [Fundo](specs/20261024-110519-background.md) | Camadas, cor base, capa borrada, rotação, beat, imagem custom |
| [Cards](specs/20261024-110520-cards.md) | Layout, relógio, data, card de música |
| [Timeline](specs/20261024-110521-timeline.md) | Interpolação da posição da música |
| [Triângulos](specs/20261025-172350-triangles.md) | Grade de triângulos reativa ao grave, fonte de cor |
