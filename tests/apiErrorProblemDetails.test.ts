import { describe, expect, it } from 'vitest';
import type { ApiErrorPayload } from '../src/types/apiError';
import { normalizeApiError } from '../src/utils/apiError';

function axiosProblem(data: ApiErrorPayload) {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: 'Request failed with status code 409',
    response: { status: 409, data },
  };
}

describe('RFC ProblemDetails API error normalization', () => {
  it('promotes a top-level ProblemDetails code into the normalized error contract', () => {
    const normalized = normalizeApiError(axiosProblem({
      code: 'P10_REVIEW_TARGET_NOT_SIGNABLE',
      message: 'Review target is not signable',
    }));

    expect(normalized).toMatchObject({
      status: 409,
      errorCode: 'P10_REVIEW_TARGET_NOT_SIGNABLE',
      message: 'Review target is not signable',
      raw: {
        code: 'P10_REVIEW_TARGET_NOT_SIGNABLE',
        message: 'Review target is not signable',
      },
    });
  });

  it.each([
    {
      payload: {
        errorCode: 'PRIMARY_ERROR_CODE',
        error: 'LEGACY_ERROR_CODE',
        code: 'PROBLEM_DETAILS_CODE',
      },
      expected: 'PRIMARY_ERROR_CODE',
    },
    {
      payload: {
        error: 'LEGACY_ERROR_CODE',
        code: 'PROBLEM_DETAILS_CODE',
      },
      expected: 'LEGACY_ERROR_CODE',
    },
    {
      payload: { code: 'PROBLEM_DETAILS_CODE' },
      expected: 'PROBLEM_DETAILS_CODE',
    },
  ] satisfies Array<{ payload: ApiErrorPayload; expected: string }>)(
    'preserves errorCode then error then code precedence: $expected',
    ({ payload, expected }) => {
      expect(normalizeApiError(axiosProblem(payload)).errorCode).toBe(expected);
    },
  );
});