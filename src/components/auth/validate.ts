export interface SignupValues {
  name: string;
  email: string;
  password: string;
}

export type SignupErrors = Partial<Record<keyof SignupValues, string>>;

export interface LoginValues {
  email: string;
  password: string;
}

export type LoginErrors = Partial<Record<keyof LoginValues, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignup(values: SignupValues): SignupErrors {
  const errors: SignupErrors = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = "Display name is required";
  } else if (name.length < 2) {
    errors.name = "Display name must be at least 2 characters";
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = "Email is required";
  } else if (!EMAIL_RE.test(email)) {
    errors.email = "Enter a valid email address";
  }

  if (!values.password) {
    errors.password = "Password is required";
  } else if (values.password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }

  return errors;
}

export function validateLogin(values: LoginValues): LoginErrors {
  const errors: LoginErrors = {};

  const email = values.email.trim();
  if (!email) {
    errors.email = "Email is required";
  } else if (!EMAIL_RE.test(email)) {
    errors.email = "Enter a valid email address";
  }

  if (!values.password) {
    errors.password = "Password is required";
  }

  return errors;
}
