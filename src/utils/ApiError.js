class ApiError extends Error{
    constructor(
        statusCode,
        message = "Something went wrong !!",
        errors= [],
        statck=""){
            super(message);
            this.errors = errors;
            this.message = message;
            this.statusCode = statusCode;
            this.success = false;
            this.data = null;

            if(statck){
                this.statck =stack;
            }
            else{

                Error.captureStackTrace(this,this.constructor)
            }
        }
}