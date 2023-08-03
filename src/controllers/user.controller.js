const catchError = require('../utils/catchError');
const User = require('../models/User');
const EmailCode = require('../models/EmailCode');
const { verifyAccount } = require('../utils/verifyAccount');
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken");
const { updatePassword } = require('../utils/updatePassword');

const getAll = catchError(async (req, res) => {
    const results = await User.findAll();
    return res.json(results);
});

const create = catchError(async (req, res) => {
    const result = await User.create(req.body);
    const { email, firstName, frontBaseUrl } = req.body
    const code = require('crypto').randomBytes(64).toString("hex")
    verifyAccount(email, firstName, frontBaseUrl, code)
    await EmailCode.create({ code, userId: result.id })
    return res.status(201).json(result);
});

const getOne = catchError(async (req, res) => {
    const { id } = req.params;
    const result = await User.findByPk(id);
    if (!result) return res.sendStatus(404);
    return res.json(result);
});

const remove = catchError(async (req, res) => {
    const { id } = req.params;
    const result = await User.destroy({ where: { id } });
    if (!result) return res.sendStatus(404);
    return res.sendStatus(204);
});

const update = catchError(async (req, res) => {
    const { id } = req.params;
    delete req.body.password
    const result = await User.update(
        req.body,
        { where: { id }, returning: true }
    );
    if (result[0] === 0) return res.sendStatus(404);
    return res.json(result[1][0]);
});

const getVerifiedCode = catchError(async (req, res) => { ///users/verify/:code
    const { code } = req.params

    const emailCode = await EmailCode.findOne({ where: { code } })

    if (!emailCode) res.sendStatus(404)

    const user = await User.update(
        { isVerified: true },
        { where: { id: emailCode.userId }, returning: true }
    )

    await emailCode.destroy()

    return res.json(user[1][0])


})

const login = catchError(async (req, res) => {
    const { email, password } = req.body

    const user = await User.findOne({ where: { email } })
    if (!user) return res.sendStatus(401)

    if (!user.isVerified) return res.sendStatus(401)

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) return res.sendStatus(401)


    const token = jwt.sign(
        { user },
        process.env.TOKEN_SECRET,
        { expiresIn: '1d' }
    )

    return res.json({ user, token })


})

const logged = catchError(async (req, res) => {
    const user = req.user
    return res.json(user)
})

const resetPassword = catchError(async (req, res) => { ///users/reset_password
    const { email, frontBaseUrl } = req.body
    const user = await User.findOne({ where: { email } })
    if (!user) return res.sendStatus(401)

    const code = require("crypto").randomBytes(64).toString("hex")
    updatePassword(email, user.firstName, frontBaseUrl, code)
    await EmailCode.create({ code, userId: user.id })

    return res.json(user)

})

const passwordUpdate = catchError(async (req, res) => {

    const { code } = req.params
    const { password } = req.body
    const hashPassword = await bcrypt.hash(password, 10)
    const emailCode = await EmailCode.findOne({ where: { code } })

    if (!emailCode) res.sendStatus(401)

    const userPasswordUpdate = await User.update(
        { password: hashPassword },
        { where: { id: emailCode.userId }, returning: true }
    )

    await emailCode.destroy()


    return res.json(userPasswordUpdate[1][0])


})

module.exports = {
    getAll,
    create,
    getOne,
    remove,
    update,
    getVerifiedCode,
    login,
    logged,
    resetPassword,
    passwordUpdate
}