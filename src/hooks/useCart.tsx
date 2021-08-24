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
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const response = await api.get<Product>(`/products/${productId}`);

      const product = response?.data;

      if(product) {
        const existCart = [...cart];

        const productExistsInCart = existCart.find(c => c.id === productId);

        var responseStock = await api.get<Stock>(`/stock/${productId}`);

        var stock = responseStock?.data;

        const currentAmount = productExistsInCart?.amount ?? 0;
        const amount = currentAmount + 1;

        if(stock && stock.amount < amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        if(productExistsInCart) {
          productExistsInCart.amount = amount;        
        } else {
          const newProduct = {
            ...product,
            amount,
          }
          existCart.push(newProduct);
        }
        setCart(existCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(existCart));
      }
      else {
        throw new Error('Erro na adição do produto');
      }
    } catch  {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {   
      const existCart = [...cart];
      
      const index = existCart.findIndex(product => product.id === productId);

      if(index>= 0) {
        existCart.splice(index, 1);
      } else {
        throw new Error('Erro na remoção do produto');
      }

      setCart(existCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(existCart));

    } catch (error) {
      toast.error(error.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        return;
      }

      const existCart = [...cart];

      const productExistsInCart = existCart.find(product => product.id === productId);

        if(!productExistsInCart) {
          throw new Error('Erro na alteração de quantidade do produto');
        }

        var responseStock = await api.get<Stock>(`/stock/${productId}`);

        var stock = responseStock?.data;

        if(stock && stock.amount < amount) {
          throw new Error('Quantidade solicitada fora de estoque');
        }

        productExistsInCart.amount = amount;

        setCart(existCart);       
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(existCart));
    } catch (error){
      toast.error(error.message);
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
