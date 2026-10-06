# Outubro Rosa — Totem 9:16

Site educativo em português, baseado nas oito telas do PDF fornecido. Preserva a arte da campanha e apresenta as seis perguntas com texto HTML e botões de toque. Desenvolvido com a skill `emil-design-eng` do projeto.

## Executar

Requer Node.js 20.19+ ou 22.12+.

```sh
npm ci
npm run dev
```

## Produção

```sh
npm run build
npm run preview
```

Publique o conteúdo de `dist/` em um servidor estático. Todas as imagens e fontes são locais: a aplicação não usa APIs ou recursos de terceiros durante a exibição. É necessário carregar o site pelo servidor; não abra o HTML diretamente por `file://`.

### Vercel

Após enviar os arquivos ao GitHub, no Vercel selecione **Add New → Project**, importe `albersmkt/outubro_rosa` e clique em **Deploy**. A configuração `vercel.json` seleciona Vite, executa `npm run build` e publica `dist/`. Não são necessárias variáveis de ambiente. Use o endereço HTTPS gerado pelo Vercel para abrir o site no computador ou na TV.

## Uso no totem

Configure a TV em orientação vertical e abra o navegador em modo kiosk/tela cheia. A área útil mantém 9:16 (referência: 1080 × 1920), sem cortes e sem rolagem. Em telas com outra proporção, aparecem margens.

Toque em “Toque na tela!” para começar e em “Clique aqui!” para avançar. “Voltar” retorna à tela anterior, “Início” reinicia e “Participar novamente” reinicia após o encerramento. Setas do teclado navegam; Escape e Home retornam ao início.

Após 90 segundos sem interação nas perguntas, a sessão retorna à abertura. O encerramento permanece por 20 segundos e também retorna à abertura. Os tempos estão em `src/main.js`. Uma aba que volta a ficar visível inicia uma nova sessão. Não são armazenados dados pessoais.

## Conteúdo e arte

Perguntas e respostas estão em `src/main.js`. Imagens derivadas do PDF enviado estão em `public/assets/`. O conteúdo educativo foi transcrito do modelo fornecido, incluindo as faixas etárias; não foi feita revisão clínica independente. Antes de exposição pública, o responsável pela campanha deve revisar o conteúdo e os direitos de uso das imagens. Os arquivos separados mencionados ainda não foram recebidos.

As telas de abertura e encerramento preservam a composição do PDF como imagens e oferecem texto equivalente para leitores de tela. As perguntas são texto editável. Os botões têm foco visível, suporte ao teclado e respeito à preferência de movimento reduzido.
