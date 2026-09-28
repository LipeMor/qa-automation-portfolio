import { z } from 'zod';

/**
 * Schemas de contrato da API do ServeRest — confirmados chamando a API local, não copiados de
 * documentação. Servem para os testes de `src/tests/api/` provarem que a FORMA da resposta é a
 * esperada, não só o status HTTP (um 200 com corpo vazio ou com campo faltando ainda quebraria um
 * consumidor real, e passaria batido só checando status).
 */

// ServeRest guarda `administrador` como string "true"/"false", não boolean — confirmado em
// respostas reais de POST/GET /usuarios. Modelar como enum aqui (em vez de boolean) evita o teste
// mentir sobre o contrato real.
export const UserSchema = z.object({
  nome: z.string(),
  email: z.string(),
  password: z.string(),
  administrador: z.enum(['true', 'false']),
  _id: z.string().length(16),
});

export const CreateUserResponseSchema = z.object({
  message: z.string(),
  _id: z.string().length(16),
});

export const ProductSchema = z.object({
  nome: z.string(),
  preco: z.number(),
  descricao: z.string(),
  quantidade: z.number(),
  _id: z.string().length(16),
});

export const CreateProductResponseSchema = z.object({
  message: z.string(),
  _id: z.string().length(16),
});

export const LoginSuccessSchema = z.object({
  message: z.string(),
  authorization: z.string().regex(/^Bearer .+$/),
});

/** Forma comum dos erros de negócio (401/403) — sempre `{ message: string }`, sem outros campos. */
export const ErrorMessageSchema = z.object({
  message: z.string(),
});

/**
 * Forma dos erros de validação de campo obrigatório (400 do POST /usuarios) — um mapa de
 * nome-do-campo para a mensagem de erro daquele campo, não um formato fixo de campos (varia
 * conforme o que faltou no payload).
 */
export const FieldValidationErrorSchema = z.record(z.string(), z.string());
