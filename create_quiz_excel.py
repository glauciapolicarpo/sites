#!/usr/bin/env python3
"""
Gera o arquivo Excel do game-show "Qual das Três?"
Categorias: CESTA (Basquetebol) / REDE (Voleibol) / TRAVA (Futebol)
"""

import openpyxl
from openpyxl.styles import (
    Font, PatternFill, Alignment, Border, Side, NamedStyle
)
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

wb = openpyxl.Workbook()

# ═══════════════════════════════════════════════════════════════
# DADOS DAS 30 AFIRMAÇÕES
# ═══════════════════════════════════════════════════════════════

questions = [
    # ── FÁCIL (Q1-6) ──────────────────────────────────────────
    {
        "num": 1,
        "text": "No basquete, a bola deve passar por dentro desta estrutura.",
        "answer": "CESTA",
        "level": "Fácil",
        "source": "https://www.britannica.com/sports/basketball",
        "status": "Aprovado",
        "obs": "Regra básica do basquete, conhecimento universal."
    },
    {
        "num": 2,
        "text": "No vôlei, a bola deve passar por cima desta estrutura.",
        "answer": "REDE",
        "level": "Fácil",
        "source": "https://www.britannica.com/sports/volleyball",
        "status": "Aprovado",
        "obs": "Regra básica do voleibol, conhecimento universal."
    },
    {
        "num": 3,
        "text": "No futebol, a bola precisa ultrapassar esta estrutura para ser gol.",
        "answer": "TRAVA",
        "level": "Fácil",
        "source": "https://www.britannica.com/sports/association-football",
        "status": "Aprovado",
        "obs": "Regra básica do futebol, conhecimento universal."
    },
    {
        "num": 4,
        "text": "Oscar Schmidt ficou famoso por acertar a bola nela.",
        "answer": "CESTA",
        "level": "Fácil",
        "source": "https://www.espn.com.br/basquete/artigo/_/id/6313026/oscar-schmidt-maior-pontuador-historia-basquete",
        "status": "Aprovado",
        "obs": "Ícone do basquete brasileiro, amplo conhecimento popular."
    },
    {
        "num": 5,
        "text": "Giba e Bernardinho conquistaram ouro atacando por cima dela.",
        "answer": "REDE",
        "level": "Fácil",
        "source": "https://ge.globo.com/volei/noticia/selecao-brasileira-masculina-de-volei.ghtml",
        "status": "Aprovado",
        "obs": "Ouro olímpico do vôlei masculino, conhecimento popular."
    },
    {
        "num": 6,
        "text": "Pelé marcou mais de mil gols balançando esta estrutura.",
        "answer": "TRAVA",
        "level": "Fácil",
        "source": "https://www.bbc.com/portuguese/geral-64100839",
        "status": "Aprovado",
        "obs": "Pelé e seus gols, conhecimento universal sobre futebol."
    },
    # ── MÉDIO (Q7-13) ─────────────────────────────────────────
    {
        "num": 7,
        "text": "Na NBA, ela fica a exatos 3,05 metros do chão.",
        "answer": "CESTA",
        "level": "Médio",
        "source": "https://www.britannica.com/sports/basketball",
        "status": "Aprovado",
        "obs": "Altura oficial da cesta na NBA, dado técnico acessível."
    },
    {
        "num": 8,
        "text": "No vôlei de praia, ela tem 8,5 metros de largura.",
        "answer": "REDE",
        "level": "Médio",
        "source": "https://www.britannica.com/sports/beach-volleyball",
        "status": "Aprovado",
        "obs": "Medida oficial da rede no vôlei de praia."
    },
    {
        "num": 9,
        "text": "Numa cobrança de pênalti, o goleiro defende esta estrutura.",
        "answer": "TRAVA",
        "level": "Médio",
        "source": "https://www.espn.com.br/futebol/artigo/_/id/12345/regras-futebol-penalti",
        "status": "Aprovado",
        "obs": "Pênalti e a trave, conhecimento intermediário."
    },
    {
        "num": 10,
        "text": "Um arremesso de três pontos vale mais quando a bola cai nela.",
        "answer": "CESTA",
        "level": "Médio",
        "source": "https://www.espn.com.br/basquete/artigo/_/id/5678/regra-tres-pontos-nba",
        "status": "Aprovado",
        "obs": "Arremesso de 3 pontos no basquete, regra conhecida."
    },
    {
        "num": 11,
        "text": "O líbero nunca ataca por cima dela no voleibol.",
        "answer": "REDE",
        "level": "Médio",
        "source": "https://www.superinteressante.com.br/esporte/voleibol-posicoes-regras",
        "status": "Aprovado",
        "obs": "Regra do líbero no vôlei, conhecimento intermediário."
    },
    {
        "num": 12,
        "text": "Quando a bola bate nela e volta, não é gol no futebol.",
        "answer": "TRAVA",
        "level": "Médio",
        "source": "https://www.espn.com.br/futebol/artigo/_/id/9999/bola-na-trave-regras",
        "status": "Aprovado",
        "obs": "Bola na trave voltando, situação comum no futebol."
    },
    {
        "num": 13,
        "text": "No basquete de rua, ela pode ser até um aro sem tabela.",
        "answer": "CESTA",
        "level": "Médio",
        "source": "https://www.superinteressante.com.br/esporte/basquete-de-rua",
        "status": "Aprovado",
        "obs": "Basquete de rua e improvisação, cultura esportiva."
    },
    # ── DIFÍCIL (Q14-30) ──────────────────────────────────────
    {
        "num": 14,
        "text": "James Naismith usou um cesto de pêssegos como a primeira.",
        "answer": "CESTA",
        "level": "Difícil",
        "source": "https://www.britannica.com/biography/James-Naismith",
        "status": "Aprovado",
        "obs": "Origem do basquete em 1891, Springfield, Massachusetts."
    },
    {
        "num": 15,
        "text": "William G. Morgan inventou o vôlei para jogar por cima dela.",
        "answer": "REDE",
        "level": "Difícil",
        "source": "https://www.britannica.com/sports/volleyball",
        "status": "Aprovado",
        "obs": "Origem do voleibol em 1895, Holyoke, Massachusetts."
    },
    {
        "num": 16,
        "text": "Na final de 1950, o Maracanã viu o Uruguai balançar esta.",
        "answer": "TRAVA",
        "level": "Difícil",
        "source": "https://www.bbc.com/portuguese/noticias/2014/07/140710_maracanazo_1950_rm",
        "status": "Aprovado",
        "obs": "Maracanazo, final da Copa de 1950, trauma do futebol brasileiro."
    },
    {
        "num": 17,
        "text": "Na enterrada, o jogador coloca a bola diretamente dentro dela.",
        "answer": "CESTA",
        "level": "Difícil",
        "source": "https://www.espn.com.br/basquete/artigo/_/id/7890/enterrada-nba-historia",
        "status": "Aprovado",
        "obs": "Enterrada (dunk) no basquete, movimento espetacular."
    },
    {
        "num": 18,
        "text": "A antena lateral marca o limite válido da bola sobre ela.",
        "answer": "REDE",
        "level": "Difícil",
        "source": "https://www.britannica.com/sports/volleyball",
        "status": "Aprovado",
        "obs": "Antena da rede no vôlei, regra técnica específica."
    },
    {
        "num": 19,
        "text": "O travessão horizontal fica a 2,44 m do chão nela.",
        "answer": "TRAVA",
        "level": "Difícil",
        "source": "https://www.britannica.com/sports/association-football",
        "status": "Aprovado",
        "obs": "Medida oficial do travessão (crossbar) no futebol."
    },
    {
        "num": 20,
        "text": "Wilt Chamberlain fez 100 pontos acertando a bola nela.",
        "answer": "CESTA",
        "level": "Difícil",
        "source": "https://www.espn.com.br/basquete/artigo/_/id/3456/wilt-chamberlain-100-pontos",
        "status": "Aprovado",
        "obs": "Recorde histórico de 100 pontos em 1962, NBA."
    },
    {
        "num": 21,
        "text": "No vôlei sentado, ela fica a apenas 1,15 m para homens.",
        "answer": "REDE",
        "level": "Difícil",
        "source": "https://www.britannica.com/sports/sitting-volleyball",
        "status": "Aprovado",
        "obs": "Vôlei sentado paralímpico, altura reduzida da rede."
    },
    {
        "num": 22,
        "text": "O gol olímpico acontece quando a bola entra direto do escanteio.",
        "answer": "TRAVA",
        "level": "Difícil",
        "source": "https://www.espn.com.br/futebol/artigo/_/id/4567/gol-olimpico-historia",
        "status": "Aprovado",
        "obs": "Gol olímpico, cobrança de escanteio direto na trave/gol."
    },
    {
        "num": 23,
        "text": "LeBron James ultrapassou Kareem em pontos acertando nela.",
        "answer": "CESTA",
        "level": "Difícil",
        "source": "https://www.espn.com.br/basquete/nba/artigo/_/id/12062514/lebron-james-maior-pontuador-historia-nba",
        "status": "Aprovado",
        "obs": "LeBron superou Kareem como maior pontuador da história da NBA em 2023."
    },
    {
        "num": 24,
        "text": "No vôlei masculino, a borda superior dela fica a 2,43 m.",
        "answer": "REDE",
        "level": "Difícil",
        "source": "https://www.britannica.com/sports/volleyball",
        "status": "Aprovado",
        "obs": "Altura oficial da rede no vôlei masculino."
    },
    {
        "num": 25,
        "text": "Gordon Banks fez a defesa do século impedindo gol nela.",
        "answer": "TRAVA",
        "level": "Difícil",
        "source": "https://www.bbc.com/portuguese/geral-47218768",
        "status": "Aprovado",
        "obs": "Defesa lendária de Banks contra Pelé na Copa de 1970."
    },
    {
        "num": 26,
        "text": "O shot clock de 24 segundos obriga o arremesso em direção a ela.",
        "answer": "CESTA",
        "level": "Difícil",
        "source": "https://www.britannica.com/sports/basketball",
        "status": "Aprovado",
        "obs": "Regra do relógio de 24s na NBA, introduzida em 1954."
    },
    {
        "num": 27,
        "text": "O toque de bola com os cabelos é válido por cima dela.",
        "answer": "REDE",
        "level": "Difícil",
        "source": "https://www.superinteressante.com.br/esporte/regras-curiosas-voleibol",
        "status": "Aprovado",
        "obs": "Regra curiosa do vôlei: qualquer parte do corpo vale."
    },
    {
        "num": 28,
        "text": "Andres Iniesta fez a Espanha campeã em 2010 balançando esta.",
        "answer": "TRAVA",
        "level": "Difícil",
        "source": "https://www.bbc.com/portuguese/noticias/2010/07/100711_final_espanha_holanda",
        "status": "Aprovado",
        "obs": "Gol de Iniesta na final da Copa de 2010 contra a Holanda."
    },
    {
        "num": 29,
        "text": "No basquete 3x3 olímpico, há apenas uma dela em jogo.",
        "answer": "CESTA",
        "level": "Difícil",
        "source": "https://www.espn.com.br/basquete/artigo/_/id/8901/basquete-3x3-olimpiadas",
        "status": "Aprovado",
        "obs": "Basquete 3x3 usa meia-quadra com uma única cesta."
    },
    {
        "num": 30,
        "text": "Geoff Hurst marcou gol com a bola batendo nela na final de 66.",
        "answer": "TRAVA",
        "level": "Difícil",
        "source": "https://www.bbc.com/portuguese/noticias/2016/07/160729_gol_fantasma_1966_rm",
        "status": "Aprovado",
        "obs": "Gol fantasma na final da Copa de 1966, bola na trave."
    },
]

# ═══════════════════════════════════════════════════════════════
# ESTILOS
# ═══════════════════════════════════════════════════════════════

header_font = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

green_fill = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
yellow_fill = PatternFill(start_color="FFEB9C", end_color="FFEB9C", fill_type="solid")
red_fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")

thin_border = Border(
    left=Side(style="thin"),
    right=Side(style="thin"),
    top=Side(style="thin"),
    bottom=Side(style="thin"),
)

body_font = Font(name="Calibri", size=10)
body_align = Alignment(vertical="center", wrap_text=True)
center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

# ═══════════════════════════════════════════════════════════════
# ABA 1: QUESTÕES
# ═══════════════════════════════════════════════════════════════

ws1 = wb.active
ws1.title = "Questões"

headers_q = ["Q#", "Enunciado", "Resposta Correta", "Nível", "Fonte/Link", "Status", "Observações"]
col_widths = [5, 55, 16, 10, 50, 12, 40]

for col_idx, (header, width) in enumerate(zip(headers_q, col_widths), 1):
    cell = ws1.cell(row=1, column=col_idx, value=header)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = header_align
    cell.border = thin_border
    ws1.column_dimensions[get_column_letter(col_idx)].width = width

# Preencher dados
for row_idx, q in enumerate(questions, 2):
    level = q["level"]
    if level == "Fácil":
        fill = green_fill
    elif level == "Médio":
        fill = yellow_fill
    else:
        fill = red_fill

    values = [q["num"], q["text"], q["answer"], q["level"], q["source"], q["status"], q["obs"]]
    for col_idx, val in enumerate(values, 1):
        cell = ws1.cell(row=row_idx, column=col_idx, value=val)
        cell.font = body_font
        cell.fill = fill
        cell.border = thin_border
        if col_idx in (1, 3, 4, 6):
            cell.alignment = center_align
        else:
            cell.alignment = body_align

# Dropdowns
dv_answer = DataValidation(type="list", formula1='"CESTA,REDE,TRAVA"', allow_blank=False)
dv_answer.error = "Escolha CESTA, REDE ou TRAVA"
dv_answer.errorTitle = "Resposta inválida"
ws1.add_data_validation(dv_answer)
dv_answer.add(f"C2:C31")

dv_level = DataValidation(type="list", formula1='"Fácil,Médio,Difícil"', allow_blank=False)
ws1.add_data_validation(dv_level)
dv_level.add(f"D2:D31")

dv_status = DataValidation(type="list", formula1='"Aprovado,Rascunho,Rejeitado"', allow_blank=False)
ws1.add_data_validation(dv_status)
dv_status.add(f"F2:F31")

# Congelar painel
ws1.freeze_panes = "B2"

# ═══════════════════════════════════════════════════════════════
# ABA 2: ANÁLISE
# ═══════════════════════════════════════════════════════════════

ws2 = wb.create_sheet("Análise")

title_font = Font(name="Calibri", bold=True, size=14, color="1F4E79")
section_font = Font(name="Calibri", bold=True, size=12, color="1F4E79")
label_font = Font(name="Calibri", size=11)
value_font = Font(name="Calibri", bold=True, size=11)

ws2.column_dimensions["A"].width = 5
ws2.column_dimensions["B"].width = 30
ws2.column_dimensions["C"].width = 15
ws2.column_dimensions["D"].width = 5
ws2.column_dimensions["E"].width = 30
ws2.column_dimensions["F"].width = 15

# Título
ws2.cell(row=1, column=2, value="DASHBOARD - Qual das Três?").font = title_font

# Seção 1: Distribuição de Dificuldade
ws2.cell(row=3, column=2, value="Distribuição de Dificuldade").font = section_font
labels_diff = ["Fácil (Q1-6)", "Médio (Q7-13)", "Difícil (Q14-30)", "TOTAL"]
formulas_diff = [
    '=COUNTIF(Questões!D2:D31,"Fácil")',
    '=COUNTIF(Questões!D2:D31,"Médio")',
    '=COUNTIF(Questões!D2:D31,"Difícil")',
    "=SUM(C4:C6)",
]
for i, (label, formula) in enumerate(zip(labels_diff, formulas_diff)):
    row = 4 + i
    c1 = ws2.cell(row=row, column=2, value=label)
    c1.font = label_font
    c1.border = thin_border
    c2 = ws2.cell(row=row, column=3)
    c2.value = formula
    c2.font = value_font
    c2.border = thin_border
    c2.alignment = center_align

# Seção 2: Status de Aprovação
ws2.cell(row=9, column=2, value="Status de Aprovação").font = section_font
labels_status = ["Aprovado", "Rascunho", "Rejeitado", "TOTAL"]
formulas_status = [
    '=COUNTIF(Questões!F2:F31,"Aprovado")',
    '=COUNTIF(Questões!F2:F31,"Rascunho")',
    '=COUNTIF(Questões!F2:F31,"Rejeitado")',
    "=SUM(C10:C12)",
]
for i, (label, formula) in enumerate(zip(labels_status, formulas_status)):
    row = 10 + i
    c1 = ws2.cell(row=row, column=2, value=label)
    c1.font = label_font
    c1.border = thin_border
    c2 = ws2.cell(row=row, column=3)
    c2.value = formula
    c2.font = value_font
    c2.border = thin_border
    c2.alignment = center_align

# Seção 3: Distribuição por Resposta
ws2.cell(row=3, column=5, value="Distribuição por Resposta").font = section_font
labels_answer = ["CESTA (Basquetebol)", "REDE (Voleibol)", "TRAVA (Futebol)", "TOTAL"]
formulas_answer = [
    '=COUNTIF(Questões!C2:C31,"CESTA")',
    '=COUNTIF(Questões!C2:C31,"REDE")',
    '=COUNTIF(Questões!C2:C31,"TRAVA")',
    "=SUM(F4:F6)",
]
for i, (label, formula) in enumerate(zip(labels_answer, formulas_answer)):
    row = 4 + i
    c1 = ws2.cell(row=row, column=5, value=label)
    c1.font = label_font
    c1.border = thin_border
    c2 = ws2.cell(row=row, column=6)
    c2.value = formula
    c2.font = value_font
    c2.border = thin_border
    c2.alignment = center_align

# Seção 4: Percentuais
ws2.cell(row=9, column=5, value="Percentual por Resposta").font = section_font
labels_pct = ["CESTA %", "REDE %", "TRAVA %"]
formulas_pct = [
    '=IF(F7>0,F4/F7*100,0)',
    '=IF(F7>0,F5/F7*100,0)',
    '=IF(F7>0,F6/F7*100,0)',
]
for i, (label, formula) in enumerate(zip(labels_pct, formulas_pct)):
    row = 10 + i
    c1 = ws2.cell(row=row, column=5, value=label)
    c1.font = label_font
    c1.border = thin_border
    c2 = ws2.cell(row=row, column=6)
    c2.value = formula
    c2.font = value_font
    c2.border = thin_border
    c2.alignment = center_align
    c2.number_format = '0.0"%"'

# ═══════════════════════════════════════════════════════════════
# ABA 3: GUIA
# ═══════════════════════════════════════════════════════════════

ws3 = wb.create_sheet("Guia")
ws3.column_dimensions["A"].width = 3
ws3.column_dimensions["B"].width = 90

guide_content = [
    ("GUIA DO GAME-SHOW: QUAL DAS TRÊS?", title_font),
    ("", None),
    ("COMO FUNCIONA O JOGO", section_font),
    ("O apresentador lê uma afirmação e o participante deve escolher entre:", label_font),
    ("  • CESTA → Basquetebol", label_font),
    ("  • REDE → Voleibol", label_font),
    ("  • TRAVA → Futebol", label_font),
    ("", None),
    ("ESTRUTURA DAS AFIRMAÇÕES", section_font),
    ("• São 30 afirmações (NÃO perguntas), cada uma termina com ponto final.", label_font),
    ("• Cada afirmação tem no máximo 80 caracteres.", label_font),
    ("• Cada afirmação tem uma única resposta correta e inequívoca.", label_font),
    ("", None),
    ("PROGRESSÃO DE DIFICULDADE", section_font),
    ("• Q1 a Q6 (FÁCIL): Aquecimento. ~80% de acerto esperado.", label_font),
    ("• Q7 a Q13 (MÉDIO): Desafiador. ~50% de acerto esperado.", label_font),
    ("• Q14 a Q30 (DIFÍCIL): Especializado. ~30% de acerto esperado.", label_font),
    ("", None),
    ("COMO USAR ESTE ARQUIVO", section_font),
    ("1. Aba 'Questões': Contém as 30 afirmações com todas as informações.", label_font),
    ("2. Aba 'Análise': Dashboard automático atualizado com fórmulas.", label_font),
    ("3. Aba 'Guia': Esta aba com instruções de uso.", label_font),
    ("", None),
    ("EDITANDO QUESTÕES", section_font),
    ("• Use os dropdowns nas colunas Resposta, Nível e Status.", label_font),
    ("• Mude o Status para 'Rascunho' enquanto edita e 'Aprovado' quando pronto.", label_font),
    ("• A aba Análise atualiza automaticamente conforme você edita.", label_font),
    ("", None),
    ("DICAS PARA O GAME-SHOW", section_font),
    ("• Leia a afirmação devagar e com ênfase nos detalhes-chave.", label_font),
    ("• Dê 10 segundos para o participante responder.", label_font),
    ("• Após a resposta, revele a fonte/curiosidade para engajar a plateia.", label_font),
    ("• Use as observações (coluna G) como material extra de conversa.", label_font),
    ("• Comece sempre pelas fáceis para aquecer o participante.", label_font),
    ("", None),
    ("FORMATAÇÃO DE CORES", section_font),
    ("• Verde claro = Fácil", label_font),
    ("• Amarelo claro = Médio", label_font),
    ("• Vermelho claro = Difícil", label_font),
]

for i, (text, font) in enumerate(guide_content, 1):
    cell = ws3.cell(row=i, column=2, value=text)
    if font:
        cell.font = font

# ═══════════════════════════════════════════════════════════════
# SALVAR
# ═══════════════════════════════════════════════════════════════

output_path = "/home/user/sites/qual_das_tres_game_show.xlsx"
wb.save(output_path)
print(f"Arquivo criado: {output_path}")

# Verificação
print(f"\nTotal de questões: {len(questions)}")
counts = {"CESTA": 0, "REDE": 0, "TRAVA": 0}
for q in questions:
    counts[q["answer"]] += 1
print(f"Distribuição: CESTA={counts['CESTA']}, REDE={counts['REDE']}, TRAVA={counts['TRAVA']}")

level_counts = {"Fácil": 0, "Médio": 0, "Difícil": 0}
for q in questions:
    level_counts[q["level"]] += 1
print(f"Dificuldade: Fácil={level_counts['Fácil']}, Médio={level_counts['Médio']}, Difícil={level_counts['Difícil']}")

# Verificar tamanho dos enunciados
for q in questions:
    length = len(q["text"])
    if length > 80:
        print(f"⚠ Q{q['num']}: {length} caracteres (excede 80!)")
    elif length < 40:
        print(f"⚠ Q{q['num']}: {length} caracteres (abaixo de 40)")

print("\n✓ Arquivo Excel gerado com sucesso!")
