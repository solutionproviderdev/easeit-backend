/* eslint-disable no-restricted-syntax */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../schemas/auth/UserSchema');
const ActivityLog = require('../../schemas/ActivityLogSchema');
const Department = require('../../schemas/auth/DepartmentSchema');

// Create a new user
exports.createUser = async (req, res) => {
	try {
		const {
			nameAsPerNID,
			nickname,
			email,
			personalPhone,
			officePhone,
			gender,
			address,
			password,
			roleId,
			departmentId,
			accessLevel,
			currentSalary,
			workingProcedure,
			documents,
			socialLinks,
			guardian,
			type,
			profilePicture,
			coverPhoto,
		} = req.body;

		// Check if user already exists
		let user = await User.findOne({ email });
		if (user) {
			return res.status(400).json({ msg: 'User already exists' });
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create a new user
		user = new User({
			nameAsPerNID,
			nickname,
			email,
			personalPhone,
			officePhone,
			gender,
			address,
			password: hashedPassword,
			roleId,
			departmentId,
			accessLevel,
			currentSalary,
			workingProcedure,
			documents,
			socialLinks,
			guardian,
			type,
			profilePicture, // Add profilePicture
			coverPhoto, // Add coverPhoto
		});

		// Save the user
		await user.save();

		// Remove the password from the response object
		const userResponse = user.toObject();
		delete userResponse.password;

		// Create an activity log entry
		await ActivityLog.create({
			userId: user._id,
			action: 'Created User',
			details: { email },
		});

		res.status(201).json(userResponse);
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ msg: 'Server error' });
	}
};

// Get all users function excluding sensitive properties and populating department and role
exports.getAllUsers = async (req, res) => {
	try {
		// Extract query parameters for filtering
		const { departmentName, roleName } = req.query;

		// Build a query object based on the query parameters
		const query = {};

		let roleInfo;

		if (departmentName) {
			// Get the department by name and set the department ID in the query
			const department = await Department.findOne({ departmentName });
			if (!department) {
				return res.status(404).json({ msg: 'Department not found' });
			}
			query.departmentId = department._id;

			// console.log(department);

			if (roleName) {
				// Get the role by name and set the role ID in the query
				const role = department.roles.find(r => r.roleName === roleName);
				if (!role) {
					return res.status(404).json({ msg: 'Role not found' });
				}
				roleInfo = role;
				query.roleId = role._id;
			}
		}

		// Find users based on the constructed query and populate the department
		const users = await User.find(query)
			.select('-password') // Exclude the password field
			.populate({
				path: 'departmentId', // Populate department
				select: 'departmentName', // Select departmentName and roles
			});

		// Manually map role information based on roleId and filter by roleName if provided
		const usersWithRolesAndDepartments = users
			.map(user => {
				const department = user.departmentId;

				if (department && department.roles && user.roleId) {
					// Find the matching role in the department
					const role = department.roles.find(
						role => role._id.toString() === user.roleId.toString()
					);
					if (role) {
						roleInfo = {
							roleId: role._id, // Include roleId
							roleName: role.roleName, // Include roleName
						};
					}
				}

				return {
					...user.toObject(), // Convert user to plain object
					department: department
						? {
								departmentId: department._id, // Include departmentId
								departmentName: department.departmentName, // Include departmentName
						  }
						: null,
					role: roleInfo, // Include role object with roleId and roleName
				};
			})
			// Filter users by roleName if provided in the query parameters
			.filter(user => {
				if (roleName) {
					return user.role && user.role.roleName === roleName;
				}
				return true;
			});

		res.status(200).json(usersWithRolesAndDepartments);
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ msg: 'Server error' });
	}
};

// Get user by ID function excluding sensitive properties and populating department and role
exports.getUserById = async (req, res) => {
	try {
		// console.log(req.params.id);
		// Find the user by ID and populate the department
		const user = await User.findById(req.params.id)
			.select('-password') // Exclude password
			.populate({
				path: 'departmentId', // Populate department
				select: 'departmentName roles', // Select departmentName and roles
			});

		if (!user) {
			return res.status(404).json({ msg: 'User not found' });
		}

		// Manually map role information based on roleId
		const department = user.departmentId;
		let roleInfo = null;

		if (department && department.roles && user.roleId) {
			// Find the matching role in the department
			const role = department.roles.find(
				role => role._id.toString() === user.roleId.toString()
			);
			if (role) {
				roleInfo = {
					roleId: role._id, // Include roleId
					roleName: role.roleName, // Include roleName
				};
			}
		}

		// Create the response object
		const userWithRoleAndDepartment = {
			...user.toObject(), // Convert user to plain object
			department: department
				? {
						departmentId: department._id, // Include departmentId
						departmentName: department.departmentName, // Include departmentName
				  }
				: null,
			role: roleInfo, // Include role object with roleId and roleName
		};

		res.status(200).json(userWithRoleAndDepartment);
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ msg: 'Server error' });
	}
};

// Get user dropdown options with department and role filters
exports.getUserDropdownOptions = async (req, res) => {
	try {
		const { departmentId, roleId } = req.query;

		// Build the filter object based on query parameters
		const filter = {};
		if (departmentId) {
			filter.departmentId = departmentId;
		}
		if (roleId) {
			filter.roleId = roleId;
		}

		// Find users with the applied filters
		const users = await User.find(filter).select(
			'nameAsPerNID nickname profilePicture _id'
		);
		res.status(200).json(users);
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ msg: 'Server error' });
	}
};

// Update user profile picture function
exports.updateUserProfilePicture = async (req, res) => {
	try {
		const user = await User.findById(req.params.id);
		if (!user) {
			return res.status(404).json({ msg: 'User not found' });
		}

		// Assuming req.body.profilePicture contains the URL of the new profile picture
		user.profilePicture = req.body.profilePicture;
		await user.save();

		// Create an activity log entry
		await ActivityLog.create({
			userId: user._id,
			action: 'Updated Profile Picture',
			details: { profilePicture: user.profilePicture },
		});

		res.status(200).json({
			msg: 'Profile picture updated',
			profilePicture: user.profilePicture,
		});
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ msg: 'Server error' });
	}
};

// Update user cover photo function
exports.updateUserCoverPhoto = async (req, res) => {
	try {
		const user = await User.findById(req.params.id);
		if (!user) {
			return res.status(404).json({ msg: 'User not found' });
		}

		// Assuming req.body.coverPhoto contains the URL of the new cover photo
		user.coverPhoto = req.body.coverPhoto;
		await user.save();

		// Create an activity log entry
		await ActivityLog.create({
			userId: user._id,
			action: 'Updated Cover Photo',
			details: { coverPhoto: user.coverPhoto },
		});

		res
			.status(200)
			.json({ msg: 'Cover photo updated', coverPhoto: user.coverPhoto });
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ msg: 'Server error' });
	}
};

// Update user status function
exports.updateUserStatus = async (req, res) => {
	try {
		const user = await User.findById(req.params.id);
		if (!user) {
			return res.status(404).json({ msg: 'User not found' });
		}

		// Update status
		user.status = req.body.status;
		await user.save();

		// Create an activity log entry
		await ActivityLog.create({
			userId: user._id,
			action: 'Updated Status',
			details: { status: user.status },
		});

		res.status(200).json({ msg: 'User status updated', status: user.status });
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ msg: 'Server error' });
	}
};

// Add user document function
exports.addUserDocument = async (req, res) => {
	try {
		const user = await User.findById(req.params.id);
		if (!user) {
			return res.status(404).json({ msg: 'User not found' });
		}

		const { documentType, documentURL } = req.body;

		// Update user's documents
		user.documents[documentType] = documentURL;
		await user.save();

		// Create an activity log entry
		await ActivityLog.create({
			userId: user._id,
			action: 'Uploaded Document',
			details: { documentType, documentURL },
		});

		res
			.status(200)
			.json({ msg: 'Document uploaded', documents: user.documents });
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ msg: 'Server error' });
	}
};

// Update user document function
exports.updateUserDocument = async (req, res) => {
	try {
		const user = await User.findById(req.params.id);
		if (!user) {
			return res.status(404).json({ msg: 'User not found' });
		}

		const { documentType, documentURL } = req.body;

		// Update user's documents
		user.documents[documentType] = documentURL;
		await user.save();

		// Create an activity log entry
		await ActivityLog.create({
			userId: user._id,
			action: 'Updated Document',
			details: { documentType, documentURL },
		});

		res
			.status(200)
			.json({ msg: 'Document updated', documents: user.documents });
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ msg: 'Server error' });
	}
};

// Update user password function with old password check
exports.updateUserPassword = async (req, res) => {
	try {
		const user = await User.findById(req.params.id);
		if (!user) {
			return res.status(404).json({ msg: 'User not found' });
		}

		const { oldPassword, newPassword } = req.body;

		// Check if the old password is correct
		const isMatch = await bcrypt.compare(oldPassword, user.password);
		if (!isMatch) {
			return res.status(400).json({ msg: 'Incorrect old password' });
		}

		// Hash the new password
		const hashedPassword = await bcrypt.hash(newPassword, 10);

		// Update the user's password
		user.password = hashedPassword;
		await user.save();

		// Create an activity log entry
		await ActivityLog.create({
			userId: user._id,
			action: 'Updated Password',
		});

		res.status(200).json({ msg: 'Password updated' });
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ msg: 'Server error' });
	}
};

// Admin update user password function without old password check
exports.adminUpdateUserPassword = async (req, res) => {
	try {
		const user = await User.findById(req.params.id);
		if (!user) {
			return res.status(404).json({ msg: 'User not found' });
		}

		const { newPassword } = req.body;

		// Hash the new password
		const hashedPassword = await bcrypt.hash(newPassword, 10);

		// Update the user's password
		user.password = hashedPassword;
		await user.save();

		// Create an activity log entry
		await ActivityLog.create({
			userId: user._id,
			action: 'Admin Updated Password',
		});

		res.status(200).json({ msg: 'Password updated by admin' });
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ msg: 'Server error' });
	}
};

// Update user details function
exports.updateUser = async (req, res) => {
	try {
		const user = await User.findById(req.params.id);
		if (!user) {
			return res.status(404).json({ msg: 'User not found' });
		}

		const updateFields = {
			nameAsPerNID: req.body.nameAsPerNID,
			nickname: req.body.nickname,
			email: req.body.email,
			personalPhone: req.body.personalPhone,
			officePhone: req.body.officePhone,
			gender: req.body.gender,
			address: req.body.address,
			roleId: req.body.roleId,
			departmentId: req.body.departmentId,
			accessLevel: req.body.accessLevel,
			currentSalary: req.body.currentSalary,
			workingProcedure: req.body.workingProcedure,
			socialLinks: req.body.socialLinks,
			guardian: req.body.guardian,
			type: req.body.type, // Added type property
		};

		// Update user fields
		for (const [key, value] of Object.entries(updateFields)) {
			if (value !== undefined) {
				user[key] = value;
			}
		}

		await user.save();

		// Remove the password from the response object
		const userResponse = user.toObject();
		delete userResponse.password;

		// Create an activity log entry
		await ActivityLog.create({
			userId: user._id,
			action: 'Updated User',
			details: { userId: user._id },
		});

		res.status(200).json(userResponse);
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ msg: 'Server error' });
	}
};

// Delete user function
exports.deleteUser = async (req, res) => {
	try {
		const user = await User.findById(req.params.id);
		if (!user) {
			return res.status(404).json({ msg: 'User not found' });
		}

		// Delete the user
		await User.deleteOne({ _id: req.params.id });

		// Create an activity log entry
		await ActivityLog.create({
			userId: user._id,
			action: 'Deleted User',
			details: { userId: user._id },
		});

		res.status(200).json({ msg: 'User deleted' });
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ msg: 'Server error' });
	}
};

// Login User
exports.loginUser = async (req, res) => {
	const { email, password } = req.body;

	try {
		// Check if user exists
		const user = await User.findOne({ email }).populate({
			path: 'departmentId',
			select: 'departmentName',
		});
		if (!user) {
			return res.status(400).json({ msg: 'No user found with this Email' });
		}

		// Check password
		const isMatch = await bcrypt.compare(password, user.password);
		// console.log('password ', isMatch, '---', user);
		if (!isMatch) {
			return res.status(400).json({ msg: 'Invalid credentials' });
		}

		// Create JWT
		const payload = { userId: user._id };
		// const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
		const token = jwt.sign(payload, process.env.JWT_SECRET, {
			expiresIn: process.env.JWT_EXPIRE,
		});

		// Set cookie
		res.cookie('session_token', token, {
			httpOnly: true,
			secure: true, // ngrok is HTTPS → force true
			// secure: process.env.NODE_ENV === 'production',
			maxAge: 3600000,
		});

		// Remove sensitive information before sending response
		const userResponse = user.toObject();
		delete userResponse.password;

		res.status(200).json({ user: userResponse, token });
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ msg: 'Server error' });
	}
};

// Logout User
exports.logoutUser = async (req, res) => {
	try {
		const { deviceToken } = req.body;
		const userId = req.user._id;

		// If a deviceToken is provided, remove it from the user's deviceTokens array.
		if (deviceToken && userId) {
			await User.updateOne(
				{ _id: userId },
				{ $pull: { deviceTokens: deviceToken } }
			);
			// console.log(`Device token ${deviceToken} removed for user ${userId}`);
		}

		// Clear the session token cookie.
		res.cookie('session_token', '', {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'Strict',
			expires: new Date(0), // Set expiration date to the past.
		});
		res.status(200).json({ msg: 'Logged out successfully' });
	} catch (error) {
		console.error('Error during logout:', error);
		res.status(500).json({ error: 'Server error during logout' });
	}
};
