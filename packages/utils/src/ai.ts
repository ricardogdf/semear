import type { AIProcessor } from "./types";

export const aiService: AIProcessor = {
  summarize: async () => `
# Resumo Executivo: Introdução Profunda

Este material aborda os conceitos avançados de aprendizagem e retenção na perspectiva de metodologias modernas. Ao longo do texto exploramos como o cérebro processa e consolida as abstrações de dados e de que maneira o ato de recuperar as memórias pode superar o simples ato de revisar conteúdos passivos.

## Metodologias Explicadas
As teorias de aprendizagem sugerem que o envolvimento forte e contínuo da mente leva a sinapses mais robustas. 

> "Não basta apenas ler uma vez e acreditar na fixação. A cognição real acontece na dúvida temporária."

### Aprofundamento no Tópico Central
Aqui detalharemos o por que este estudo funciona:
- **Codificação Exigente:** Aprender com esforço eleva os padrões de aprendizagem. Se o aprendizado parecer fácil, frequentemente a retenção será curta e não se tornará memória durável.
- **Intercalação de Áreas:** A técnica de variar o estudo de temas melhora drasticamente o sucesso a longo prazo pois impede o viés da familiaridade.

## Dicas para Memorização Final
Mantenha consistência diária de pelo menos 30 minutos nas revisões ativas e elabore mapas conceituais (como os nossos presentes ali na aba de tópicos!).
`,
  generateShortSummary: async () =>
    "Material sobre técnicas de aprendizagem ativa e retenção de memória, abordando codificação exigente e intercalação de áreas de estudo.",
  generateMindMap: async () =>
    "Mapa mental mockado com nós para conceitos principais, conexões entre tópicos e revisões recomendadas.",
  extractKeywords: async () => [
    "Aprendizagem Ativa", 
    "Resgate de Memória", 
    "Esquecimento Estratégico",
    "Estudo Intercalado",
    "Metacognição",
    "Codificação Neural",
    "Dificuldade Desejável"
  ],
  generateQuestions: async () => Array.from({ length: 30 }).map((_, i) => ({
    question: `Pergunta exemplo conceitual sobre o texto gerada automaticamente pela IA - Questão ${i + 1}?`,
    options: [
      `A - Alternativa correta da questão ${i + 1}`,
      `B - Distrator comum da questão ${i + 1}`,
      `C - Distrator absurdo da questão ${i + 1}`,
      `D - Distrator plausível da questão ${i + 1}`,
    ],
    answer: `A - Alternativa correta da questão ${i + 1}`,
  })),
};
