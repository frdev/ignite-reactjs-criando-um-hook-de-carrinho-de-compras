import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    return storagedCart ? JSON.parse(storagedCart) : [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      const cartIndex = cart.findIndex((product) => product.id === productId);

      if (
        !stock.amount ||
        (cartIndex > -1 && cart[cartIndex].amount >= stock.amount)
      )
        throw new Error('Quantidade solicitada fora de estoque');

      if (cartIndex > -1) cart[cartIndex].amount++;
      else {
        const { data: product } = await api.get(`products/${productId}`);

        cart.push({ ...product, amount: 1 });
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));

      setCart([...cart]);
    } catch (err) {
      const messageError = err.message.includes('404')
        ? 'Erro na adição do produto'
        : err.message;

      toast.error(messageError);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartIndex = cart.findIndex((product) => product.id === productId);

      if (cartIndex < 0) throw new Error('Erro na remoção do produto');

      cart.splice(cartIndex, 1);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));

      setCart([...cart]);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const cartIndex = cart.findIndex((product) => product.id === productId);

      if (amount < 1 || cartIndex < 0)
        throw new Error('Erro na alteração de quantidade do produto');

      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      if (!stock.amount || amount > stock.amount)
        throw new Error('Quantidade solicitada fora de estoque');

      cart[cartIndex].amount = amount;

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));

      setCart([...cart]);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
