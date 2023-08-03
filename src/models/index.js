const EmailCode = require("./EmailCode");
const User = require("./User");

//userId ->Email
User.hasOne(EmailCode) //userId
EmailCode.belongsTo(User)