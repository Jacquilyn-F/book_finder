import User from '../models/User.js';
import { signToken } from '../services/auth.js';
import { Document } from 'mongoose';

interface Context {
    user?: { _id: string };
}


interface BookData {
    bookId: string;
    title: string;
    authors: string[];
    description?: string;
    image?: string;
    link?: string;
}

interface UserDocument extends Document {
    username: string;
    email: string;
    password: string;
    savedBooks: BookData[];
    isCorrectPassword(password: string): Promise<boolean>;
}

interface LoginArgs {
    email: string;
    password: string;
}

interface AddUserArgs {
    username: string;
    email: string;
    password: string;
}

interface SaveBookArgs {
    bookData: BookData;
}

interface RemoveBookArgs {
    bookId: string;
}

const resolvers = {
    Query: {
        me: async (_parent: unknown, _args: unknown, context: Context) => {
            if (context.user) {
                return User.findById(context.user._id).populate('savedBooks');
            }
            throw new Error('Not authenticated');
        },
    },
    Mutation: {
        login: async (_parent: unknown, { email, password }: LoginArgs) => {
            const user = await User.findOne({ email }) as UserDocument | null;
            if (!user) {
                throw new Error("User not found");
            }
            const isCorrectPassword = await user.isCorrectPassword(password);
            if (!isCorrectPassword) {
                throw new Error("Incorrect password");
            }
            const token = signToken(user.username, user.email, user._id);
            return { token, user };
        },
        addUser: async (_parent: unknown, { username, email, password }: AddUserArgs) => {
            const user = await User.create({ username, email, password }) as UserDocument;
            const token = signToken(user.username, user.email, user._id);
            return { token, user };
        },
        saveBook: async (_parent: unknown, { bookData }: SaveBookArgs, context: Context) => {
            if (context.user) {
                return User.findByIdAndUpdate(
                    context.user._id,
                    { $addToSet: { savedBooks: bookData } },
                    { new: true, runValidators: true }
                ).populate('savedBooks');
            }
            throw new Error('Not authenticated');
        },
        removeBook: async (_parent: unknown, { bookId }: RemoveBookArgs, context: Context) => {
            if (context.user) {
                return User.findByIdAndUpdate(
                    context.user._id,
                    { $pull: { savedBooks: { bookId } } },
                    { new: true }
                ).populate('savedBooks');
            }
            throw new Error('Not authenticated');
        },
    },
};

export default resolvers;
