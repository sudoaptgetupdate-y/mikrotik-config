const userService = require('../services/userService');

exports.createUser = async (req, res) => {
  const newUser = await userService.createUser(req.user.role, req.body);
  res.status(201).json({ message: "User created successfully", user: newUser });
};

exports.getUsers = async (req, res) => {
  const users = await userService.getUsers(req.user.role);
  res.json(users);
};

exports.getUserById = async (req, res) => {
  const user = await userService.getUserById(req.params.id, req.user.id, req.user.role);
  res.json(user);
};

exports.updateUser = async (req, res) => {
  const updatedUser = await userService.updateUser(req.params.id, req.user.id, req.user.role, req.body);
  res.json(updatedUser);
};

exports.deleteUser = async (req, res) => {
  await userService.deleteUser(req.params.id, req.user.role);
  res.json({ message: "User deleted successfully" });
};