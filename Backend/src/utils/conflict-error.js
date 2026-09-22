class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 409;
    this.status = "fail";
  }
}

export default ConflictError;
