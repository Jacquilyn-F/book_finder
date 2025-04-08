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
          const foundUser = await User.findOne({ _id: context.user._id }).populate('savedBooks');
          if (!foundUser) {
            throw new Error('Cannot find a user with this id!');
          }
          return foundUser;
        }
        throw new Error('Not authenticated');
      },
    },
    Mutation: {
        login: async (_parent: unknown, { email, password }: LoginArgs) => {
            const user = await User.findOne({ $or: [{ email }, { username: email }] }) as UserDocument | null;
            if (!user) {
                throw new Error("Can't find this user");
            }

            const correctPw = await user.isCorrectPassword(password);
            if (!correctPw) {
                throw new Error('Wrong password!');
            }

            const token = signToken(user.username, user.email, user._id);
            return { token, user };
        },
        addUser: async (_parent: unknown, { username, email, password }: AddUserArgs) => {
            const user = await User.create({ username, email, password }) as UserDocument;

            if (!user) {
                throw new Error('Something is wrong!');
            }

            const token = signToken(user.username, user.email, user._id);
            return { token, user };
        },
        saveBook: async (_parent: unknown, { bookData }: SaveBookArgs, context: Context) => {
            if (context.user) {
              const updatedUser = await User.findOneAndUpdate(
                { _id: context.user._id },
                { $addToSet: { savedBooks: bookData } },
                { new: true, runValidators: true }
              ).populate('savedBooks');
              if (!updatedUser) {
                throw new Error('Failed to save the book.');
              }
              return updatedUser;
            }
            throw new Error('Not authenticated');
          },
        removeBook: async (_parent: unknown, { bookId }: RemoveBookArgs, context: Context) => {
            if (context.user) {
                const updatedUser = await User.findOneAndUpdate(
                    { _id: context.user._id },
                    { $pull: { savedBooks: { bookId } } },
                    { new: true }
                ).populate('savedBooks');

                if (!updatedUser) {
                    throw new Error("Couldn't find user with this id!");
                }

                return updatedUser;
            }
            throw new Error('Not authenticated');
        },
    },
};

export default resolvers;
