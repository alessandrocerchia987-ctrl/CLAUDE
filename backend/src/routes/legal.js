const express = require('express');

const router = express.Router();

const PAGE_STYLE = `
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 720px; margin: 0 auto; padding: 32px 20px 80px; color: #1B2A4A; line-height: 1.6; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  h2 { font-size: 17px; margin-top: 32px; color: #1B2A4A; }
  .updated { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
  .notice { background: #FFF7ED; border: 1px solid #FDBA74; border-radius: 8px; padding: 12px 16px; font-size: 13px; margin-bottom: 24px; }
  ul { padding-left: 20px; }
`;

function page(title, bodyHtml) {
  return `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — Emprego Já</title>
  <style>${PAGE_STYLE}</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

router.get('/privacy-policy', (req, res) => {
  res.send(
    page(
      'Política de Privacidade',
      `
    <h1>Política de Privacidade — Emprego Já</h1>
    <p class="updated">Última actualização: [preencher data]</p>
    <div class="notice">Este documento é um modelo/rascunho preparado para acelerar o lançamento da aplicação. Não substitui aconselhamento jurídico.</div>

    <h2>1. Introdução</h2>
    <p>Esta Política de Privacidade explica como a Emprego Já ("nós", "a aplicação") recolhe, usa, partilha e protege as informações dos utilizadores ("você") que usam a aplicação, seja como Candidato ou como Empregador. Ao criar uma conta, você aceita as práticas descritas neste documento.</p>

    <h2>2. Que informações recolhemos</h2>
    <p><strong>Fornecidas por si durante o registo e uso da aplicação:</strong></p>
    <ul>
      <li>Nome completo ou nome da empresa</li>
      <li>Número de telefone</li>
      <li>Palavra-passe (armazenada de forma encriptada)</li>
      <li>Idade e género (opcional)</li>
      <li>Localização</li>
      <li>Foto de perfil</li>
      <li>Para Candidatos: sector, experiência, educação, idiomas, competências, disponibilidade, salário esperado, portfólio</li>
      <li>Para Empregadores: nome da empresa, tipo de vaga procurada, requisitos, descrição da empresa</li>
      <li>Vagas publicadas e candidaturas enviadas</li>
      <li>Histórias (fotos e legendas), visíveis por 24 horas</li>
      <li>Mensagens trocadas através da aplicação</li>
      <li>Registo dos pagamentos efectuados (valor, finalidade, estado)</li>
    </ul>
    <p>Não recolhemos nem armazenamos dados de cartões de pagamento. Os pagamentos são processados directamente pela ZumboPay, o nosso processador de pagamentos, que comunica com o M-Pesa, e-Mola ou a rede do cartão usado.</p>

    <h2>3. Como usamos as suas informações</h2>
    <ul>
      <li>Ligar Candidatos a Empregadores relevantes</li>
      <li>Mostrar o seu perfil e vagas a outros utilizadores</li>
      <li>Permitir contacto após desbloqueio</li>
      <li>Enviar notificações relevantes</li>
      <li>Processar candidaturas, vagas, histórias e pagamentos</li>
      <li>Melhorar e corrigir a aplicação</li>
    </ul>

    <h2>4. Com quem partilhamos as suas informações</h2>
    <ul>
      <li><strong>Outros utilizadores:</strong> nome, foto, sector, localização e perfil são visíveis conforme o tipo de conta.</li>
      <li><strong>Número de telefone:</strong> só é mostrado a um Empregador depois de desbloquear o contacto ou depois de você se candidatar a uma vaga sua.</li>
      <li><strong>WhatsApp:</strong> se usar o botão "Abrir WhatsApp", a conversa passa a ser gerida pelo WhatsApp/Meta.</li>
      <li><strong>ZumboPay:</strong> dados necessários à transacção são partilhados para processar pagamentos via M-Pesa, e-Mola ou cartão.</li>
      <li><strong>Autoridades:</strong> apenas se exigido por lei moçambicana.</li>
    </ul>
    <p>Não vendemos os seus dados pessoais a terceiros para fins de publicidade.</p>

    <h2>5. Fotos e Histórias</h2>
    <p>As Histórias desaparecem automaticamente 24 horas após a publicação.</p>

    <h2>6. Conservação de dados</h2>
    <p>Mantemos os seus dados enquanto a sua conta estiver activa. Pode eliminar a sua conta a qualquer momento na aplicação (Perfil → Eliminar conta), o que remove os seus dados dos sistemas activos, excepto quando formos legalmente obrigados a conservar certos registos.</p>

    <h2>7. Os seus direitos</h2>
    <ul>
      <li>Aceder e corrigir as suas informações directamente na aplicação</li>
      <li>Eliminar a sua conta e os seus dados na aplicação</li>
      <li>Bloquear outro utilizador na aplicação</li>
      <li>Contactar-nos com questões sobre os seus dados pessoais</li>
    </ul>
    <p>Contacto para questões de privacidade: <strong>[preencher e-mail de contacto]</strong></p>

    <h2>8. Menores de idade</h2>
    <p>A Emprego Já destina-se a maiores de 18 anos. Contas de menores de idade serão eliminadas se identificadas.</p>

    <h2>9. Segurança</h2>
    <p>Usamos medidas técnicas razoáveis, incluindo encriptação de palavras-passe e ligações seguras. Nenhum sistema é 100% seguro.</p>

    <h2>10. Alterações a esta política</h2>
    <p>Podemos actualizar esta política periodicamente, notificando alterações relevantes através da aplicação.</p>

    <h2>11. Contacto</h2>
    <p><strong>[preencher nome da empresa/responsável]</strong><br/><strong>[preencher e-mail de contacto]</strong></p>
  `
    )
  );
});

router.get('/terms-of-service', (req, res) => {
  res.send(
    page(
      'Termos de Serviço',
      `
    <h1>Termos de Serviço — Emprego Já</h1>
    <p class="updated">Última actualização: [preencher data]</p>
    <div class="notice">Este documento é um modelo/rascunho preparado para acelerar o lançamento da aplicação. Não substitui aconselhamento jurídico.</div>

    <h2>1. Aceitação dos termos</h2>
    <p>Ao criar uma conta ou usar a aplicação Emprego Já, você concorda com estes Termos de Serviço.</p>

    <h2>2. Quem pode usar a aplicação</h2>
    <ul>
      <li>Deve ter pelo menos 18 anos.</li>
      <li>Deve fornecer informações verdadeiras e manter o perfil actualizado.</li>
      <li>É responsável pela confidencialidade da sua palavra-passe.</li>
    </ul>

    <h2>3. Tipo de conta é permanente</h2>
    <p>No registo, escolhe entre Candidato ou Empregador. Esta escolha é definitiva na mesma conta.</p>

    <h2>4. Como funciona a aplicação</h2>
    <p>A Emprego Já liga candidatos a empregadores. Não é uma agência de emprego nem parte de qualquer relação laboral, e não garante contratação nem preenchimento de vagas.</p>

    <h2>5. Selo de verificação</h2>
    <p>Indica um processo de verificação básico — não garante idoneidade, capacidade financeira ou legalidade das vagas publicadas.</p>

    <h2>6. Pagamentos e taxas</h2>
    <p>As seguintes acções têm uma taxa, cobrada via M-Pesa, e-Mola ou cartão (processado pela ZumboPay):</p>
    <ul>
      <li><strong>Publicar uma vaga:</strong> 100 MZN, com opção de pagar mais 50 MZN para impulsionar a vaga</li>
      <li><strong>Candidatar-se a uma vaga:</strong> 50 MZN</li>
      <li><strong>Desbloquear o contacto de um candidato:</strong> 50 MZN</li>
    </ul>
    <p><strong>Publicar uma História é gratuito.</strong> Podemos alterar os valores no futuro, com aviso prévio. Salvo indicação em contrário, os pagamentos não são reembolsáveis.</p>

    <h2>7. Conduta proibida</h2>
    <ul>
      <li>Publicar vagas fraudulentas, enganosas ou ilegais</li>
      <li>Solicitar pagamentos fora da aplicação como condição de emprego</li>
      <li>Conteúdo discriminatório ou ofensivo</li>
      <li>Assediar, ameaçar ou enganar outros utilizadores</li>
      <li>Contas falsas ou personificação</li>
      <li>Uso ilegal da aplicação</li>
    </ul>

    <h2>8. Conteúdo publicado por utilizadores</h2>
    <p>Você é responsável pelo seu conteúdo. Podemos remover conteúdo ou suspender contas que violem estes Termos. Pode denunciar vagas e bloquear outros utilizadores directamente na aplicação.</p>

    <h2>9. Histórias</h2>
    <p>As Histórias ficam visíveis 24 horas, após as quais são removidas automaticamente.</p>

    <h2>10. Partilha de contacto</h2>
    <p>Ao permitir que um Empregador desbloqueie o seu contacto, autoriza a partilha do seu número de telefone para fins de comunicação relacionada com oportunidades de emprego.</p>

    <h2>11. Suspensão e encerramento de conta</h2>
    <p>Podemos suspender ou encerrar contas em caso de violação, fraude ou uso indevido. Pode eliminar a sua conta a qualquer momento na aplicação, em Perfil → Eliminar conta — acção permanente que remove os seus dados dos sistemas activos.</p>

    <h2>12. Isenção de garantias</h2>
    <p>A aplicação é fornecida "tal como está", sem garantias de disponibilidade contínua, ausência de erros, ou adequação a um fim específico.</p>

    <h2>13. Limitação de responsabilidade</h2>
    <p>Na medida permitida pela lei moçambicana, não somos responsáveis por danos indirectos, perda de rendimentos, ou disputas entre Candidatos e Empregadores.</p>

    <h2>14. Lei aplicável</h2>
    <p>Estes Termos são regidos pelas leis da República de Moçambique.</p>

    <h2>15. Alterações aos termos</h2>
    <p>O uso continuado da aplicação após uma actualização constitui aceitação dos novos Termos.</p>

    <h2>16. Contacto</h2>
    <p><strong>[preencher nome da empresa/responsável]</strong><br/><strong>[preencher e-mail de contacto]</strong></p>
  `
    )
  );
});

module.exports = router;
