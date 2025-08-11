#include <iostream>
#include "math_utils.h"

int main()
{
  int a = 5, b = 3;
  std::cout << "Addition: " << a << " + " << b << " = " << add(a, b) << std::endl;
  std::cout << "Multiplication: " << a << " * " << b << " = " << multiply(a, b) << std::endl;

  return 0;
}
