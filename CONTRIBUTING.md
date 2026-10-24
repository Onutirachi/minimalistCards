# Contribuindo

## Fluxo

1. **Spec primeiro.** Mudanças de comportamento começam por uma spec em [`docs/specs/`](docs/README.md).
2. **Implementação.** Implemente com commits pequenos, seguindo o padrão abaixo.
3. **Verificação.** Rode `npm test` e confira o resultado em `dev/` (veja o README). Antes de publicar, confira também no próprio Wallpaper Engine.

## Commits

O projeto usa [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo opcional>): <descrição no imperativo, em inglês, minúscula>

<corpo opcional: o porquê da mudança; cite requisitos como REQ-TL-2>
```

| Tipo | Uso |
|---|---|
| `feat` | Nova funcionalidade visível para o usuário |
| `fix` | Correção de bug |
| `perf` | Melhoria de desempenho sem mudar comportamento |
| `refactor` | Mudança interna sem mudar comportamento |
| `docs` | Somente documentação e specs |
| `test` | Somente testes |
| `style` | Formatação, sem mudança de lógica |
| `chore` | Build, assets, configuração, `project.json` |

**Escopos:** `core`, `audio`, `bars`, `background`, `cards`, `clock`, `date`, `track`, `timeline`, `debug`, `dev`, `fonts`.

**Exemplos:**

```
fix(timeline): never move the displayed position backwards
perf(background): bake the blur into a canvas once per cover
feat(cards)!: drop the legacy font names
```

O `!` (ou o rodapé `BREAKING CHANGE:`) marca mudanças que exigem que o usuário reconfigure o wallpaper, por exemplo uma chave do `project.json` renomeada.

## Propriedades do usuário

- **Chaves do `project.json`:** as chaves são o que o Wallpaper Engine usa para salvar as escolhas dos usuários. Renomear uma chave apaga a configuração salva. O erro de digitação `trackcardartits*` é mantido por isso.
- **Propriedade nova:**
  - adicione-a no editor do WE, o que atualiza o `project.json`;
  - adicione a entrada correspondente em `src/core/settings.js`;
  - rode `npm test`, que confere chaves, defaults e limites.

## Publicar no Workshop

O `project.json` contém `"workshopid": "3596377391"`. Publicar esta pasta pelo editor do Wallpaper Engine (**Share → Share Wallpaper on Workshop**) **atualiza** o item existente. Nunca remova esse campo.
