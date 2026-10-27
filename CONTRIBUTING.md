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

**Escopos:** `core`, `audio`, `bars`, `background`, `triangles`, `cards`, `clock`, `date`, `track`, `timeline`, `settings`, `debug`, `dev`, `fonts`.

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
  - adicione a entrada correspondente em `wallpaper/src/core/settings.js`;
  - coloque-a na seção certa do painel, com rótulo e dica, em `tools/settingsPanel.mjs`;
  - rode `npm run panel` e depois `npm test`, que confere chaves, defaults, limites e se o painel está em sincronia.
- **Painel de configurações:** rótulos, ordem, condições, descrições e dicas vêm de `tools/settingsPanel.mjs`, não do editor do WE. Depois de mudar um default, um rótulo ou a ordem, rode `npm run panel`. Uma edição feita direto no editor do WE é sobrescrita na próxima vez que o comando rodar, e o `npm test` avisa quando o `project.json` sai de sincronia.

## Publicar no Workshop

### Preview e prints

`npm run preview` grava o wallpaper tocando as músicas de [`tools/preview/tracks.json`](tools/preview/tracks.json) e gera um `preview.gif` quadrado de 256×256 em loop, com o maior frame rate que cabe no limite de 1 MB do Wallpaper Engine. Os arquivos saem em `tools/preview/output/`; copie o GIF para `wallpaper/preview.gif`.

- `npm run preview -- --screenshots`: um PNG 1920×1080 por música, para a página do Workshop.
- `npm run preview -- --wide`: um GIF 16:9 de 720 px.
- `npm run preview -- --stills`: também salva o primeiro e o último quadro (a emenda do loop) e o meio de cada música, para conferir.

As capas ficam em `tools/preview/covers/`, fora do Git. O `tracks.json` define a ordem, títulos, artistas, cores (as do overlay "Show debug info" do WE), duração de cada música no GIF, hora, idioma e ajustes do wallpaper. Precisa do Chrome instalado (ou `CHROME_PATH`).

### Publicação

**Publique a pasta `wallpaper/`, nunca a raiz do projeto.** O editor do WE envia a pasta inteira. Pela raiz, isso incluiria a `.git` (cujos arquivos somente leitura fazem a cópia falhar com "Acesso negado"), o `node_modules`, as capas do preview, os testes e a documentação. Por isso `wallpaper/` contém só o que o WE carrega (`index.html`, `project.json`, `preview.gif` e `src/`); nada de ferramentas, testes ou docs dentro dela.

No WE, abra `wallpaper/project.json` e publique (**Share → Share Wallpaper on Workshop**). O WE incrementa a `version` desse arquivo ao publicar; faça commit dele em seguida.

O `project.json` contém `"workshopid": "3596377391"`, e é isso que faz a publicação **atualizar** o item existente. Nunca remova esse campo.
