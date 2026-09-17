import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";


const CartContext = createContext();


export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const savedCart =
      localStorage.getItem("techloom-cart");

    return savedCart
      ? JSON.parse(savedCart)
      : [];
  });


  useEffect(() => {
    localStorage.setItem(
      "techloom-cart",
      JSON.stringify(cart)
    );
  }, [cart]);


  const addToCart = (
    product,
    quantity = 1
  ) => {
    setCart((currentCart) => {
      const existingItem =
        currentCart.find(
          (item) =>
            item.id === product.id
        );

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: Math.min(
                  item.quantity + quantity,
                  product.stock_quantity
                ),
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity,
        },
      ];
    });
  };


  const removeFromCart = (productId) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.id !== productId
      )
    );
  };


  const updateQuantity = (
    productId,
    quantity
  ) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== productId) {
          return item;
        }

        const safeQuantity = Math.max(
          1,
          Math.min(
            quantity,
            item.stock_quantity
          )
        );

        return {
          ...item,
          quantity: safeQuantity,
        };
      })
    );
  };


  const clearCart = () => {
    setCart([]);
  };


  const cartCount = cart.reduce(
    (total, item) =>
      total + item.quantity,
    0
  );


  const cartTotal = cart.reduce(
    (total, item) =>
      total +
      Number(item.price) *
        item.quantity,
    0
  );


  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}


export function useCart() {
  return useContext(CartContext);
}