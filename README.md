# Node LSM-Tree Engine

Um motor de armazenamento de alto desempenho inspirado em bancos de dados como **RocksDB** e **Cassandra**, construído do zero com Node.js puro.

## O que este motor faz?
Este projeto implementa uma **LSM-Tree (Log-Structured Merge-Tree)**, otimizada para escritas rápidas e leituras eficientes.

### Componentes Principais:
- **Write-Ahead Log (WAL):** Garante durabilidade; nenhum dado é perdido se o sistema cair.
- **MemTable:** Armazenamento em memória para escrita ultra-rápida.
- **SSTables (Sorted String Tables):** Arquivos de disco imutáveis e ordenados.
- **Bloom Filters:** Estrutura probabilística para evitar leituras desnecessárias no disco.
- **Sparse Index:** Índice eficiente em memória para localização rápida de dados no disco.
- **Compaction:** Processo de limpeza que remove duplicatas e interpreta **Tombstones** (deletes).
- **HTTP API:** Servidor nativo para interação remota.

## Como rodar
1. Instale as dependências:
```bash
   npm install

```

2. Inicie o servidor:
```bash
node src/server.js

```


## Testes

O projeto possui uma suíte completa de testes de unidade e integração (Vitest):

```bash
npm test

```
