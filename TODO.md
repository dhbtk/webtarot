- [ ] Substituir polling por websocket: subscribe no id da tiragem → recebe atualização do backend
- [ ] Notificação quando interpretação fica pronta
- [ ] Botão de compartilhar na tiragem
- [ ] Cadastro de usuário?
- [ ] pequena bio para incluir como contexto para a pergunta
- [ ] campo de contexto para interpretar

backend only:

- organizar código em camadas: handler, controllers, repositories
- state: ter dependências cruas no state e usar extratores para obter controllers/repositories/etc.

**migrar armazenamento de redis para postgresql**

tabelas:

- readings (id, created_at, question, context, cards, shuffled_times, user_id, user_self_description,
  interpretation_status,
  interpretation_text,
  deleted_at)
- users (id, created_at, updated_at, email, password_digest, name, self_description, google_user_id)
- access_tokens (id, user_id, created_at, token, last_user_ip, last_user_agent, deleted_at)

* coluna user_id de readings **não é** foreign key para users. assim podemos distinguir entre usuários anônimos e
  cadastrados (anônimo = nenhuma linha na tabela users)
* auth check no router do frontend; endpoint `/api/v1/auth_check/{id}` que retorna um json
  `{"authenticationRequired": true}` se o usuário estiver cadastrado e precisar logar.
* ao logar, mandar junto o user_id gerado no front. se ele não for de um usuário cadastrado, atribuir as readings todas
  desse user_id para o usuário que está logando.
