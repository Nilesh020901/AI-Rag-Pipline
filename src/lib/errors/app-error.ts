export class AppError extends Error {
  constructor(
    message: string,
    readonly publicMessage: string = message,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function toPublicErrorMessage(error: unknown): { message: string; status: number } {
  if (error instanceof AppError) {
    return { message: error.publicMessage, status: error.status };
  }
  if (error instanceof Error) {
    console.error(error);
    return { message: 'Something went wrong. Please try again.', status: 500 };
  }
  return { message: 'Unexpected error.', status: 500 };
}
