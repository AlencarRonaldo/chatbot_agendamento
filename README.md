# Bot de Agendamento de Coleta para WhatsApp

Este projeto é uma solução de automação para WhatsApp projetada para agendar coletas de óleo de forma eficiente que pode ser modificado para qualquer tipo de coleta. O bot guia o usuário através de um fluxo de conversa para coletar as informações necessárias e salva os agendamentos em um arquivo local.

## Funcionalidades Principais

- **Fluxo de Conversa Automatizado**: O bot interage com o usuário para coletar nome, endereço, dia da coleta, período e quantidade de litros.
- **Validação de Dias**: Permite agendamentos apenas para dias pré-definidos (Segunda, Quarta e Sexta).
- **Limite de Agendamentos Diários**: Controla o número de coletas por dia para não exceder a capacidade operacional (limite de 10 por dia).
- **Agendamento Inteligente**: Se o dia escolhido estiver lotado, o bot procura automaticamente o próximo dia disponível para agendar.
- **Geração de Rotas**: Inclui um script auxiliar para gerar um link do Google Maps com a rota otimizada para as coletas de um dia específico.
- **Notificação de Rota**: Inclui um segundo script para enviar automaticamente a rota do dia seguinte para um número de WhatsApp pré-definido.

## Como Executar a Aplicação

### Pré-requisitos

- [Node.js](https://nodejs.org/) instalado
- Um número de WhatsApp para ser usado pelo bot

### Passos para Execução

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/AlencarRonaldo/chatbot_agendamento.git
    cd chatbot_agendamento
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Execute o bot principal:**
    ```bash
    node index.js
    ```
    - Na primeira vez, um QR Code aparecerá no terminal. Escaneie-o com o aplicativo do WhatsApp para fazer o login.

4.  **Para gerar a rota manualmente:**
    ```bash
    # Substitua 'segunda' pelo dia desejado (quarta ou sexta)
    node gerar-rota.js segunda
    ```

5.  **Para enviar a rota do dia seguinte automaticamente:**
    ```bash
    node enviar-rota.js
    ```
    - Este script também pedirá para escanear um QR Code na primeira vez, usando uma sessão separada.

## Estrutura do Projeto

- `index.js`: O arquivo principal do bot de agendamento.
- `enviar-rota.js`: O script para enviar a rota do dia seguinte via WhatsApp.
- `gerar-rota.js`: O script para gerar o link da rota no terminal.
- `agendamentos.json`: Arquivo gerado automaticamente para armazenar os agendamentos. (Este arquivo não é versionado por segurança).
- `.gitignore`: Define os arquivos e pastas a serem ignorados pelo Git.
